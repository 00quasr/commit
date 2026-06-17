import { canonicalPair } from "@commit/domain";
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

const baseDropArgs = {
  caption: "shipped",
  visibility: "friends" as const,
};

async function seedDropFromAlice(t: ReturnType<typeof makeTest>) {
  vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));
  await t.run(async (ctx) => {
    const aliceId = await ctx.db.insert("profiles", {
      clerkUserId: "user_alice",
      username: "alice",
      usernameLower: "alice",
      timezone: "UTC",
      createdAt: 0,
    });
    const bobId = await ctx.db.insert("profiles", {
      clerkUserId: "user_bob",
      username: "bob",
      usernameLower: "bob",
      timezone: "UTC",
      createdAt: 0,
    });
    // Bob is an accepted friend of Alice so he may see her friends-tier drops.
    const { low, high } = canonicalPair(aliceId, bobId);
    await ctx.db.insert("friendships", {
      pairLow: low,
      pairHigh: high,
      requesterId: aliceId,
      status: "accepted",
      createdAt: 0,
    });
  });
  return await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);
}

// Inserts a profile and makes it an accepted friend of Alice.
async function seedFriendOfAlice(t: ReturnType<typeof makeTest>, key: string) {
  return await t.run(async (ctx) => {
    const id = await ctx.db.insert("profiles", {
      clerkUserId: `user_${key}`,
      username: key,
      usernameLower: key,
      timezone: "UTC",
      createdAt: 0,
    });
    const alice = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "user_alice"))
      .unique();
    const { low, high } = canonicalPair(alice!._id, id);
    await ctx.db.insert("friendships", {
      pairLow: low,
      pairHigh: high,
      requesterId: alice!._id,
      status: "accepted",
      createdAt: 0,
    });
    return id;
  });
}

// Inserts a profile with no friendship to Alice.
async function seedStranger(t: ReturnType<typeof makeTest>, key: string) {
  return await t.run((ctx) =>
    ctx.db.insert("profiles", {
      clerkUserId: `user_${key}`,
      username: key,
      usernameLower: key,
      timezone: "UTC",
      createdAt: 0,
    }),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("reactions.toggle", () => {
  test("first reaction inserts row + increments drops.reactionCount → 'added'", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);

    const result = await t
      .withIdentity(asBob)
      .mutation(api.reactions.toggle, { dropId, emoji: "🔥" });

    expect(result).toBe("added");
    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.reactionCount).toBe(1);
    const reactions = await t.run((ctx) => ctx.db.query("reactions").collect());
    expect(reactions).toHaveLength(1);
  });

  test("same emoji second time deletes + decrements → 'removed'", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);

    await t.withIdentity(asBob).mutation(api.reactions.toggle, { dropId, emoji: "🔥" });
    const result = await t
      .withIdentity(asBob)
      .mutation(api.reactions.toggle, { dropId, emoji: "🔥" });

    expect(result).toBe("removed");
    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.reactionCount).toBe(0);
    const reactions = await t.run((ctx) => ctx.db.query("reactions").collect());
    expect(reactions).toHaveLength(0);
  });

  test("different emoji updates without changing count → 'updated'", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);

    await t.withIdentity(asBob).mutation(api.reactions.toggle, { dropId, emoji: "🔥" });
    const result = await t
      .withIdentity(asBob)
      .mutation(api.reactions.toggle, { dropId, emoji: "💯" });

    expect(result).toBe("updated");
    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.reactionCount).toBe(1);
    const reactions = await t.run((ctx) => ctx.db.query("reactions").collect());
    expect(reactions).toHaveLength(1);
    expect(reactions[0]?.emoji).toBe("💯");
  });

  test("two different reactors each contribute 1 to count", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);
    await seedFriendOfAlice(t, "eve");

    await t.withIdentity(asBob).mutation(api.reactions.toggle, { dropId, emoji: "🔥" });
    await t
      .withIdentity({ subject: "user_eve" })
      .mutation(api.reactions.toggle, { dropId, emoji: "💪" });

    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.reactionCount).toBe(2);
  });

  test("rejects unknown drop", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);
    await t.run(async (ctx) => {
      await ctx.db.delete(dropId);
    });

    await expect(
      t.withIdentity(asBob).mutation(api.reactions.toggle, { dropId, emoji: "🔥" }),
    ).rejects.toThrow(/not found/i);
  });

  test("rejects a non-friend reacting to a friends-tier drop (COM-135)", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);
    await seedStranger(t, "carol");

    await expect(
      t
        .withIdentity({ subject: "user_carol" })
        .mutation(api.reactions.toggle, { dropId, emoji: "🔥" }),
    ).rejects.toThrow(/forbidden/i);
    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.reactionCount).toBe(0);
  });

  test("rejects reacting to a private drop, even from a friend (COM-135)", async () => {
    const t = makeTest();
    await seedDropFromAlice(t); // seeds alice + bob (accepted friends)
    const privateDropId = await t
      .withIdentity(asAlice)
      .mutation(api.drops.create, { caption: "secret", visibility: "private" });

    await expect(
      t.withIdentity(asBob).mutation(api.reactions.toggle, { dropId: privateDropId, emoji: "🔥" }),
    ).rejects.toThrow(/forbidden/i);
  });

  test("allows a non-friend to react to a public drop (COM-135)", async () => {
    const t = makeTest();
    await seedDropFromAlice(t);
    await seedStranger(t, "carol");
    const publicDropId = await t
      .withIdentity(asAlice)
      .mutation(api.drops.create, { caption: "ship it", visibility: "public" });

    const result = await t
      .withIdentity({ subject: "user_carol" })
      .mutation(api.reactions.toggle, { dropId: publicDropId, emoji: "🔥" });
    expect(result).toBe("added");
  });
});
