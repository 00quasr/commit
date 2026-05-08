import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");
function makeTest() {
  return convexTest(schema, modules);
}

const asAlice = { subject: "user_alice" };

const baseDropArgs = {
  caption: "x",
  tags: [],
  difficulty: "easy" as const,
  visibility: "friends" as const,
};

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

describe("drops.heatmapForProfile", () => {
  test("returns empty array for a profile with no drops", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);

    const heatmap = await t.query(api.drops.heatmapForProfile, { profileId: aliceId });
    expect(heatmap).toEqual([]);
  });

  test("aggregates drop counts per dayKey", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);

    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T08:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);
    vi.setSystemTime(new Date("2026-05-07T20:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);
    vi.setSystemTime(new Date("2026-05-08T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const heatmap = await t.query(api.drops.heatmapForProfile, { profileId: aliceId });
    const map = new Map(heatmap.map((h) => [h.dayKey, h.count]));
    expect(map.get("2026-05-07")).toBe(2);
    expect(map.get("2026-05-08")).toBe(1);
  });

  test("returns empty for unknown profileId", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);
    await t.run(async (ctx) => {
      await ctx.db.delete(aliceId);
    });

    const heatmap = await t.query(api.drops.heatmapForProfile, { profileId: aliceId });
    expect(heatmap).toEqual([]);
  });
});

describe("drops.recentForProfile", () => {
  test("returns own drops including private, newest first", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);

    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T08:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, {
      ...baseDropArgs,
      caption: "first",
      visibility: "public",
    });
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, {
      ...baseDropArgs,
      caption: "second",
      visibility: "private",
    });
    vi.setSystemTime(new Date("2026-05-07T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, {
      ...baseDropArgs,
      caption: "third",
      visibility: "friends",
    });

    const recent = await t
      .withIdentity(asAlice)
      .query(api.drops.recentForProfile, { profileId: aliceId });
    expect(recent.map((r) => r.drop.caption)).toEqual(["third", "second", "first"]);
  });

  test("non-owner sees public drops only (friends/private hidden until Phase 4)", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);
    await t.run((ctx) =>
      ctx.db.insert("profiles", {
        clerkUserId: "user_eve",
        username: "eve",
        usernameLower: "eve",
        timezone: "UTC",
        createdAt: 0,
      }),
    );
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    await t.withIdentity(asAlice).mutation(api.drops.create, {
      ...baseDropArgs,
      caption: "public",
      visibility: "public",
    });
    await t.withIdentity(asAlice).mutation(api.drops.create, {
      ...baseDropArgs,
      caption: "friends",
      visibility: "friends",
    });
    await t.withIdentity(asAlice).mutation(api.drops.create, {
      ...baseDropArgs,
      caption: "private",
      visibility: "private",
    });

    const recent = await t
      .withIdentity({ subject: "user_eve" })
      .query(api.drops.recentForProfile, { profileId: aliceId });
    expect(recent.map((r) => r.drop.caption)).toEqual(["public"]);
  });

  test("respects limit", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    for (let i = 0; i < 5; i++) {
      vi.setSystemTime(new Date(`2026-05-07T${String(12 + i).padStart(2, "0")}:00:00Z`));
      await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);
    }

    const recent = await t
      .withIdentity(asAlice)
      .query(api.drops.recentForProfile, { profileId: aliceId, limit: 3 });
    expect(recent).toHaveLength(3);
  });

  test("rejects unauthenticated caller", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);
    await expect(t.query(api.drops.recentForProfile, { profileId: aliceId })).rejects.toThrow(
      /Unauthenticated/,
    );
  });
});
