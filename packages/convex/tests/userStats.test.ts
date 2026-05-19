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
  caption: "shipped",
  tags: ["@build"],
  difficulty: "medium" as const,
  visibility: "friends" as const,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("userStats.forCaller", () => {
  test("returns null before first drop", async () => {
    const t = makeTest();
    await t.run((ctx) =>
      ctx.db.insert("profiles", {
        clerkUserId: "user_alice",
        username: "alice",
        usernameLower: "alice",
        timezone: "UTC",
        createdAt: 0,
      }),
    );

    const stats = await t.withIdentity(asAlice).query(api.userStats.forCaller, {});
    expect(stats).toBeNull();
  });

  test("returns the caller's stats after a drop", async () => {
    const t = makeTest();
    await t.run((ctx) =>
      ctx.db.insert("profiles", {
        clerkUserId: "user_alice",
        username: "alice",
        usernameLower: "alice",
        timezone: "UTC",
        createdAt: 0,
      }),
    );
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const stats = await t.withIdentity(asAlice).query(api.userStats.forCaller, {});
    expect(stats).not.toBeNull();
    expect(stats?.streak).toBe(1);
  });

  test("rejects unauthenticated caller", async () => {
    const t = makeTest();
    await expect(t.query(api.userStats.forCaller, {})).rejects.toThrow(/Unauthenticated/);
  });
});

describe("userStats.forProfile", () => {
  test("returns the given profile's stats (no auth required)", async () => {
    const t = makeTest();
    const aliceId = await t.run((ctx) =>
      ctx.db.insert("profiles", {
        clerkUserId: "user_alice",
        username: "alice",
        usernameLower: "alice",
        timezone: "UTC",
        createdAt: 0,
      }),
    );
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    // Anonymous caller can read alice's public stats.
    const stats = await t.query(api.userStats.forProfile, { profileId: aliceId });
    expect(stats).not.toBeNull();
    expect(stats?.streak).toBe(1);
  });

  test("returns null for a profile with no stats yet", async () => {
    const t = makeTest();
    const ghostId = await t.run((ctx) =>
      ctx.db.insert("profiles", {
        clerkUserId: "user_ghost",
        username: "ghost",
        usernameLower: "ghost",
        timezone: "UTC",
        createdAt: 0,
      }),
    );

    const stats = await t.query(api.userStats.forProfile, { profileId: ghostId });
    expect(stats).toBeNull();
  });
});
