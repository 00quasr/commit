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

describe("views.markSeen", () => {
  test("first view inserts row + increments drops.viewCount", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);

    await t.withIdentity(asBob).mutation(api.views.markSeen, { dropId });

    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.viewCount).toBe(1);
    const views = await t.run((ctx) => ctx.db.query("views").collect());
    expect(views).toHaveLength(1);
  });

  test("second view from same viewer is a no-op (idempotent)", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);

    await t.withIdentity(asBob).mutation(api.views.markSeen, { dropId });
    await t.withIdentity(asBob).mutation(api.views.markSeen, { dropId });

    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.viewCount).toBe(1);
    const views = await t.run((ctx) => ctx.db.query("views").collect());
    expect(views).toHaveLength(1);
  });

  test("two distinct viewers each contribute 1 to count", async () => {
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

    await t.withIdentity(asBob).mutation(api.views.markSeen, { dropId });
    await t.withIdentity({ subject: "user_eve" }).mutation(api.views.markSeen, { dropId });

    const drop = await t.run((ctx) => ctx.db.get(dropId));
    expect(drop?.viewCount).toBe(2);
  });

  test("rejects unknown drop", async () => {
    const t = makeTest();
    const dropId = await seedDropFromAlice(t);
    await t.run(async (ctx) => {
      await ctx.db.delete(dropId);
    });

    await expect(t.withIdentity(asBob).mutation(api.views.markSeen, { dropId })).rejects.toThrow(
      /not found/i,
    );
  });
});
