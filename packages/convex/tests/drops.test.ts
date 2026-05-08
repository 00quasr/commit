import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

function makeTest() {
  return convexTest(schema, modules);
}

async function seedAlice(t: ReturnType<typeof makeTest>) {
  return await t.run((ctx) =>
    ctx.db.insert("profiles", {
      clerkUserId: "user_alice",
      username: "alice",
      usernameLower: "alice",
      timezone: "UTC",
      createdAt: 0,
    }),
  );
}

const asAlice = { subject: "user_alice" };

const baseDropArgs = {
  caption: "shipped",
  tags: ["@build"],
  difficulty: "medium" as const,
  visibility: "friends" as const,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("drops.create — basic", () => {
  test("first-ever drop: streak=1, xpAwarded=base, userStats inserted", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const dropId = await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.ownerId).toBe(aliceId);
    expect(drop?.dayKey).toBe("2026-05-07");
    expect(drop?.xpAwarded).toBe(60); // medium @ streak 1 → multiplier 1.0
    expect(drop?.visibility).toBe("friends");
    expect(drop?.reactionCount).toBe(0);
    expect(drop?.viewCount).toBe(0);

    const stats = await t.run((ctx) =>
      ctx.db
        .query("userStats")
        .withIndex("by_profile", (q) => q.eq("profileId", aliceId))
        .unique(),
    );
    expect(stats?.streak).toBe(1);
    expect(stats?.totalXp).toBe(60);
    expect(stats?.level).toBe(1); // floor(sqrt(60/50)) = 1
    expect(stats?.totalDrops).toBe(1);
    expect(stats?.lastDropDayKey).toBe("2026-05-07");
    expect(stats?.graceCardsAvailable).toBe(0);
    expect(stats?.longestStreak).toBe(1);
  });

  test("links the drop back to its habit and patches habit.lastDropDayKey", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "ship it",
      difficulty: "medium",
      cycleDays: 1,
    });
    const dropId = await t
      .withIdentity(asAlice)
      .mutation(api.drops.create, { ...baseDropArgs, habitId });

    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.habitId).toBe(habitId);
    const habit = await t.run((ctx) => ctx.db.get(habitId));
    expect(habit?.lastDropDayKey).toBe("2026-05-07");
  });

  test("normalizes tags: lowercase + dedupe, max 5 enforced", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const dropId = await t.withIdentity(asAlice).mutation(api.drops.create, {
      ...baseDropArgs,
      tags: ["  @Build  ", "@build", "@HEALTH", " ", ""],
    });
    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.tags.sort()).toEqual(["@build", "@health"].sort());

    await expect(
      t.withIdentity(asAlice).mutation(api.drops.create, {
        ...baseDropArgs,
        tags: ["a", "b", "c", "d", "e", "f"],
      }),
    ).rejects.toThrow(/too many tags/);
  });

  test("rejects caption longer than 100 chars", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    await expect(
      t.withIdentity(asAlice).mutation(api.drops.create, {
        ...baseDropArgs,
        caption: "x".repeat(101),
      }),
    ).rejects.toThrow(/100/);
  });

  test("emits drop_created activityEvent", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);
    const events = await t.run((ctx) => ctx.db.query("activityEvents").collect());
    expect(events).toHaveLength(2); // drop_created + level_up (60 XP → level 1 from 0)
    expect(events.map((e) => e.kind).sort()).toEqual(["drop_created", "level_up"]);
  });
});

describe("drops.create — streak rules", () => {
  test("consecutive day extends streak to 2", async () => {
    const t = makeTest();
    await seedAlice(t);

    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    vi.setSystemTime(new Date("2026-05-08T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const stats = await t.run((ctx) => ctx.db.query("userStats").first());
    expect(stats?.streak).toBe(2);
    expect(stats?.lastDropDayKey).toBe("2026-05-08");
    expect(stats?.totalDrops).toBe(2);
  });

  test("same-day second drop: streak unchanged, totalDrops += 1", async () => {
    const t = makeTest();
    await seedAlice(t);

    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T08:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    vi.setSystemTime(new Date("2026-05-07T20:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const stats = await t.run((ctx) => ctx.db.query("userStats").first());
    expect(stats?.streak).toBe(1);
    expect(stats?.totalDrops).toBe(2);
  });

  test("gap day with no grace card resets streak to 1", async () => {
    const t = makeTest();
    await seedAlice(t);

    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    // Skip the 8th, drop on the 9th
    vi.setSystemTime(new Date("2026-05-09T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const stats = await t.run((ctx) => ctx.db.query("userStats").first());
    expect(stats?.streak).toBe(1);
    expect(stats?.lastDropDayKey).toBe("2026-05-09");
  });

  test("hits 7-day streak, earns grace card, emits streak_milestone + grace_card_earned", async () => {
    const t = makeTest();
    await seedAlice(t);

    // Simulate 7 consecutive days
    for (let day = 1; day <= 7; day++) {
      const iso = `2026-05-0${day}T12:00:00Z`;
      vi.useFakeTimers().setSystemTime(new Date(iso));
      await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);
    }

    const stats = await t.run((ctx) => ctx.db.query("userStats").first());
    expect(stats?.streak).toBe(7);
    expect(stats?.graceCardsAvailable).toBe(1);
    expect(stats?.longestStreak).toBe(7);

    const events = await t.run((ctx) => ctx.db.query("activityEvents").collect());
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("streak_milestone");
    expect(kinds).toContain("grace_card_earned");
  });

  test("gap day with grace card consumes card, keeps streak going, emits grace_card_consumed", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);

    // Manually seed userStats as if alice has a 10-day streak with a grace card.
    await t.run(async (ctx) => {
      await ctx.db.insert("userStats", {
        profileId: aliceId,
        totalXp: 600,
        level: 3,
        streak: 10,
        longestStreak: 10,
        graceCardsAvailable: 1,
        lastDropDayKey: "2026-05-05",
        totalDrops: 10,
        updatedAt: 0,
      });
    });

    // Skip 6th, drop 7th — gap of 2 days
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const stats = await t.run((ctx) => ctx.db.query("userStats").first());
    expect(stats?.streak).toBe(11); // grace consumed, streak+1
    expect(stats?.graceCardsAvailable).toBe(0);

    const events = await t.run((ctx) => ctx.db.query("activityEvents").collect());
    expect(events.some((e) => e.kind === "grace_card_consumed")).toBe(true);
  });
});
