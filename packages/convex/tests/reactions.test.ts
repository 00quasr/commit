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
  tags: ["@build"],
  difficulty: "medium" as const,
  visibility: "friends" as const,
};

async function seedDropFromAlice(t: ReturnType<typeof makeTest>) {
  vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));
  await t.run(async (ctx) => {
    await ctx.db.insert("profiles", {
      clerkUserId: "user_alice",
      username: "alice",
      usernameLower: "alice",
      timezone: "UTC",
      createdAt: 0,
    });
    await ctx.db.insert("profiles", {
      clerkUserId: "user_bob",
      username: "bob",
      usernameLower: "bob",
      timezone: "UTC",
      createdAt: 0,
    });
  });
  return await t.withIdentity(asAlice).mutation(api.drops.create, baseDropArgs);
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
    await t.run(async (ctx) => {
      await ctx.db.insert("profiles", {
        clerkUserId: "user_eve",
        username: "eve",
        usernameLower: "eve",
        timezone: "UTC",
        createdAt: 0,
      });
    });

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
});
