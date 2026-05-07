import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

function makeTest() {
  return convexTest(schema, modules);
}

const asAlice = { subject: "user_alice" };
const asBob = { subject: "user_bob" };
const asEve = { subject: "user_eve" };

const baseDropArgs = {
  caption: "shipped",
  tags: ["@build"],
  difficulty: "medium" as const,
  visibility: "friends" as const,
};

/**
 * Sets up: alice + bob friends, eve as a non-friend stranger. All three exist.
 * `nowIso` controls the current time so dayKey is deterministic.
 */
async function seedSocialGraph(t: ReturnType<typeof makeTest>, nowIso: string) {
  vi.useFakeTimers().setSystemTime(new Date(nowIso));
  const ids = await t.run(async (ctx) => {
    const aliceId = await ctx.db.insert("profiles", {
      clerkUserId: "user_alice",
      username: "alice",
      usernameLower: "alice",
      timezone: "UTC",
      createdAt: 0, // ancient — past 24h grace
    });
    const bobId = await ctx.db.insert("profiles", {
      clerkUserId: "user_bob",
      username: "bob",
      usernameLower: "bob",
      timezone: "UTC",
      createdAt: 0,
    });
    const eveId = await ctx.db.insert("profiles", {
      clerkUserId: "user_eve",
      username: "eve",
      usernameLower: "eve",
      timezone: "UTC",
      createdAt: 0,
    });
    return { aliceId, bobId, eveId };
  });
  // alice <-> bob accepted friendship
  const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
    otherProfileId: ids.bobId,
  });
  await t.withIdentity(asBob).mutation(api.friendships.accept, { friendshipId });
  return ids;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("drops.feedForUser — locked", () => {
  test("alice hasn't dropped today: returns locked=true with blurredCount=N from friends", async () => {
    const t = makeTest();
    await seedSocialGraph(t, "2026-05-07T12:00:00Z");

    // bob drops twice today
    await t.withIdentity(asBob).mutation(api.drops.create, baseDropArgs);
    await t.withIdentity(asBob).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    expect(result.locked).toBe(true);
    if (result.locked) {
      expect(result.blurredCount).toBe(2);
    }
  });

  test("non-friend (eve) drops do not count toward alice's blurredCount", async () => {
    const t = makeTest();
    await seedSocialGraph(t, "2026-05-07T12:00:00Z");

    await t.withIdentity(asEve).mutation(api.drops.create, baseDropArgs);
    await t.withIdentity(asBob).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    expect(result.locked).toBe(true);
    if (result.locked) {
      expect(result.blurredCount).toBe(1); // only bob's
    }
  });

  test("private drops are not counted in blurredCount", async () => {
    const t = makeTest();
    await seedSocialGraph(t, "2026-05-07T12:00:00Z");

    await t
      .withIdentity(asBob)
      .mutation(api.drops.create, { ...baseDropArgs, visibility: "private" });

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    expect(result.locked).toBe(true);
    if (result.locked) {
      expect(result.blurredCount).toBe(0);
    }
  });
});

describe("drops.feedForUser — unlocked", () => {
  test("after alice drops, returns locked=false with bob's drops enriched with author", async () => {
    const t = makeTest();
    const { bobId } = await seedSocialGraph(t, "2026-05-07T12:00:00Z");

    await t.withIdentity(asBob).mutation(api.drops.create, baseDropArgs);
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    expect(result.locked).toBe(false);
    if (!result.locked) {
      expect(result.drops).toHaveLength(1);
      expect(result.drops[0]!.drop.ownerId).toBe(bobId);
      expect(result.drops[0]!.author.username).toBe("bob");
    }
  });

  test("alice's own drops are not in her own feed (only friends')", async () => {
    const t = makeTest();
    await seedSocialGraph(t, "2026-05-07T12:00:00Z");

    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    expect(result.locked).toBe(false);
    if (!result.locked) {
      expect(result.drops).toHaveLength(0);
    }
  });

  test("public drops from friends are included alongside friends-tier", async () => {
    const t = makeTest();
    await seedSocialGraph(t, "2026-05-07T12:00:00Z");

    await t
      .withIdentity(asBob)
      .mutation(api.drops.create, { ...baseDropArgs, visibility: "public" });
    await t
      .withIdentity(asBob)
      .mutation(api.drops.create, { ...baseDropArgs, visibility: "friends" });
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    expect(result.locked).toBe(false);
    if (!result.locked) {
      expect(result.drops).toHaveLength(2);
    }
  });

  test("private drops from friends are NOT in the feed", async () => {
    const t = makeTest();
    await seedSocialGraph(t, "2026-05-07T12:00:00Z");

    await t
      .withIdentity(asBob)
      .mutation(api.drops.create, { ...baseDropArgs, visibility: "private" });
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    expect(result.locked).toBe(false);
    if (!result.locked) {
      expect(result.drops).toHaveLength(0);
    }
  });

  test("drops are sorted newest first", async () => {
    const t = makeTest();
    await seedSocialGraph(t, "2026-05-07T08:00:00Z");

    await t.withIdentity(asBob).mutation(api.drops.create, {
      ...baseDropArgs,
      caption: "early",
    });

    vi.setSystemTime(new Date("2026-05-07T18:00:00Z"));
    await t.withIdentity(asBob).mutation(api.drops.create, {
      ...baseDropArgs,
      caption: "late",
    });

    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    if (!result.locked) {
      expect(result.drops[0]!.drop.caption).toBe("late");
      expect(result.drops[1]!.drop.caption).toBe("early");
    }
  });

  test("non-friend drops are excluded from the unlocked feed", async () => {
    const t = makeTest();
    await seedSocialGraph(t, "2026-05-07T12:00:00Z");

    await t.withIdentity(asEve).mutation(api.drops.create, baseDropArgs);
    await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    if (!result.locked) {
      expect(result.drops).toHaveLength(0);
    }
  });
});

describe("drops.feedForUser — first-time grace", () => {
  test("brand-new user (within 24h of createdAt) sees feed unlocked even without dropping", async () => {
    const t = makeTest();
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const ids = await t.run(async (ctx) => {
      const aliceId = await ctx.db.insert("profiles", {
        clerkUserId: "user_alice",
        username: "alice",
        usernameLower: "alice",
        timezone: "UTC",
        createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      });
      const bobId = await ctx.db.insert("profiles", {
        clerkUserId: "user_bob",
        username: "bob",
        usernameLower: "bob",
        timezone: "UTC",
        createdAt: 0,
      });
      return { aliceId, bobId };
    });
    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: ids.bobId,
    });
    await t.withIdentity(asBob).mutation(api.friendships.accept, { friendshipId });

    await t.withIdentity(asBob).mutation(api.drops.create, baseDropArgs);

    const result = await t.withIdentity(asAlice).query(api.drops.feedForUser, {});
    expect(result.locked).toBe(false); // alice gets grace despite not dropping
    if (!result.locked) {
      expect(result.drops).toHaveLength(1);
    }
  });
});
