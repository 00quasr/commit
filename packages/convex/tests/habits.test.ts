import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");
function makeTest() {
  return convexTest(schema, modules);
}

const asAlice = { subject: "user_alice" };

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

afterEach(() => {
  vi.useRealTimers();
});

describe("habits.create", () => {
  test("inserts a habit with archived=false and no lastDropDayKey", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);

    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "code 1h",
      difficulty: "medium",
      cycleDays: 1,
    });

    const habit = await t.run((ctx) => ctx.db.get(habitId));
    expect(habit?.ownerId).toBe(aliceId);
    expect(habit?.text).toBe("code 1h");
    expect(habit?.cycleDays).toBe(1);
    expect(habit?.archived).toBe(false);
    expect(habit?.lastDropDayKey).toBeUndefined();
  });

  test("trims whitespace and rejects empty text", async () => {
    const t = makeTest();
    await seedAlice(t);

    await expect(
      t.withIdentity(asAlice).mutation(api.habits.create, {
        text: "   ",
        difficulty: "easy",
        cycleDays: 1,
      }),
    ).rejects.toThrow(/empty/);
  });

  test("rejects text > 280 chars", async () => {
    const t = makeTest();
    await seedAlice(t);

    await expect(
      t.withIdentity(asAlice).mutation(api.habits.create, {
        text: "x".repeat(281),
        difficulty: "easy",
        cycleDays: 1,
      }),
    ).rejects.toThrow(/280/);
  });

  test("rejects cycleDays out of range or non-integer", async () => {
    const t = makeTest();
    await seedAlice(t);

    for (const bad of [0, -1, 32, 1.5]) {
      await expect(
        t.withIdentity(asAlice).mutation(api.habits.create, {
          text: "x",
          difficulty: "easy",
          cycleDays: bad,
        }),
      ).rejects.toThrow(/cycleDays/);
    }
  });

  test("rejects unauthenticated caller", async () => {
    const t = makeTest();
    await expect(
      t.mutation(api.habits.create, { text: "x", difficulty: "easy", cycleDays: 1 }),
    ).rejects.toThrow(/Unauthenticated/);
  });
});

describe("habits.archive / unarchive", () => {
  test("archive sets archived=true; idempotent", async () => {
    const t = makeTest();
    await seedAlice(t);
    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "x",
      difficulty: "easy",
      cycleDays: 1,
    });

    await t.withIdentity(asAlice).mutation(api.habits.archive, { habitId });
    const after = await t.run((ctx) => ctx.db.get(habitId));
    expect(after?.archived).toBe(true);

    // Idempotent — second archive is a no-op
    await t.withIdentity(asAlice).mutation(api.habits.archive, { habitId });
    const after2 = await t.run((ctx) => ctx.db.get(habitId));
    expect(after2?.archived).toBe(true);
  });

  test("unarchive restores archived=false", async () => {
    const t = makeTest();
    await seedAlice(t);
    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "x",
      difficulty: "easy",
      cycleDays: 1,
    });

    await t.withIdentity(asAlice).mutation(api.habits.archive, { habitId });
    await t.withIdentity(asAlice).mutation(api.habits.unarchive, { habitId });
    const after = await t.run((ctx) => ctx.db.get(habitId));
    expect(after?.archived).toBe(false);
  });

  test("rejects non-owner", async () => {
    const t = makeTest();
    await seedAlice(t);
    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "x",
      difficulty: "easy",
      cycleDays: 1,
    });
    await t.run((ctx) =>
      ctx.db.insert("profiles", {
        clerkUserId: "user_eve",
        username: "eve",
        usernameLower: "eve",
        timezone: "UTC",
        createdAt: 0,
      }),
    );

    await expect(
      t.withIdentity({ subject: "user_eve" }).mutation(api.habits.archive, { habitId }),
    ).rejects.toThrow(/Not your habit/);
  });
});

describe("habits.list", () => {
  test("returns active habits for caller, newest first", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T08:00:00Z"));

    await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "first",
      difficulty: "easy",
      cycleDays: 1,
    });
    vi.setSystemTime(new Date("2026-05-07T09:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "second",
      difficulty: "easy",
      cycleDays: 2,
    });

    const list = await t.withIdentity(asAlice).query(api.habits.list, {});
    expect(list.map((h) => h.text)).toEqual(["second", "first"]);
  });

  test("excludes archived habits", async () => {
    const t = makeTest();
    await seedAlice(t);

    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "active",
      difficulty: "easy",
      cycleDays: 1,
    });
    await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "to-archive",
      difficulty: "easy",
      cycleDays: 1,
    });
    const otherId = (await t.run((ctx) => ctx.db.query("habits").collect())).find(
      (h) => h._id !== habitId,
    )!._id;
    await t.withIdentity(asAlice).mutation(api.habits.archive, { habitId: otherId });

    const list = await t.withIdentity(asAlice).query(api.habits.list, {});
    expect(list.map((h) => h.text)).toEqual(["active"]);
  });
});

describe("habits.dueToday", () => {
  test("daily habit with no last drop is due today", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "daily",
      difficulty: "easy",
      cycleDays: 1,
    });

    const due = await t.withIdentity(asAlice).query(api.habits.dueToday, {});
    expect(due.map((h) => h.text)).toEqual(["daily"]);
  });

  test("habit dropped today is NOT in dueToday", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "daily",
      difficulty: "easy",
      cycleDays: 1,
    });
    await t.withIdentity(asAlice).mutation(api.drops.create, {
      habitId,
      caption: "did it",
      tags: [],
      difficulty: "easy",
      visibility: "friends",
    });

    const due = await t.withIdentity(asAlice).query(api.habits.dueToday, {});
    expect(due).toHaveLength(0);
  });

  test("every-2-days habit: not due day 2, due day 3", async () => {
    const t = makeTest();
    await seedAlice(t);

    vi.useFakeTimers().setSystemTime(new Date("2026-05-05T12:00:00Z"));
    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "gym",
      difficulty: "hard",
      cycleDays: 2,
    });
    await t.withIdentity(asAlice).mutation(api.drops.create, {
      habitId,
      caption: "done",
      tags: [],
      difficulty: "hard",
      visibility: "friends",
    });

    // Day 6: only 1 day after, NOT due
    vi.setSystemTime(new Date("2026-05-06T12:00:00Z"));
    let due = await t.withIdentity(asAlice).query(api.habits.dueToday, {});
    expect(due).toHaveLength(0);

    // Day 7: 2 days after, due
    vi.setSystemTime(new Date("2026-05-07T12:00:00Z"));
    due = await t.withIdentity(asAlice).query(api.habits.dueToday, {});
    expect(due).toHaveLength(1);
  });

  test("archived habits are excluded from dueToday", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "archived",
      difficulty: "easy",
      cycleDays: 1,
    });
    await t.withIdentity(asAlice).mutation(api.habits.archive, { habitId });

    const due = await t.withIdentity(asAlice).query(api.habits.dueToday, {});
    expect(due).toHaveLength(0);
  });

  test("missed-cycle habit stays due (does not shift schedule)", async () => {
    const t = makeTest();
    await seedAlice(t);

    // Create cycleDays=2 habit, drop once, then jump 10 days ahead
    vi.useFakeTimers().setSystemTime(new Date("2026-04-27T12:00:00Z"));
    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "gym",
      difficulty: "hard",
      cycleDays: 2,
    });
    await t.withIdentity(asAlice).mutation(api.drops.create, {
      habitId,
      caption: "first",
      tags: [],
      difficulty: "hard",
      visibility: "friends",
    });

    vi.setSystemTime(new Date("2026-05-07T12:00:00Z"));
    const due = await t.withIdentity(asAlice).query(api.habits.dueToday, {});
    expect(due).toHaveLength(1);
  });
});
