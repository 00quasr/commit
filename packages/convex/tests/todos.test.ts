import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

function makeTest() {
  return convexTest(schema, modules);
}

async function seedAlice(t: ReturnType<typeof makeTest>) {
  return await t.run(async (ctx) =>
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

afterEach(() => {
  vi.useRealTimers();
});

describe("todos.create", () => {
  test("inserts row with caller's dayKey + difficulty", async () => {
    const t = makeTest();
    const aliceId = await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const todoId = await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "ship it",
      difficulty: "hard",
    });

    const todo = await t.run((ctx) => ctx.db.get(todoId));
    expect(todo?.ownerId).toBe(aliceId);
    expect(todo?.text).toBe("ship it");
    expect(todo?.difficulty).toBe("hard");
    expect(todo?.dayKey).toBe("2026-05-07");
    expect(todo?.completedAt).toBeUndefined();
  });

  test("trims whitespace and rejects empty text", async () => {
    const t = makeTest();
    await seedAlice(t);

    await expect(
      t.withIdentity(asAlice).mutation(api.todos.create, {
        text: "   ",
        difficulty: "easy",
      }),
    ).rejects.toThrow(/empty/);
  });

  test("rejects text longer than 280 chars", async () => {
    const t = makeTest();
    await seedAlice(t);

    await expect(
      t.withIdentity(asAlice).mutation(api.todos.create, {
        text: "x".repeat(281),
        difficulty: "easy",
      }),
    ).rejects.toThrow(/280/);
  });
});

describe("todos.complete", () => {
  test("marks completedAt on first call, idempotent on second", async () => {
    const t = makeTest();
    await seedAlice(t);
    const todoId = await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "x",
      difficulty: "easy",
    });

    await t.withIdentity(asAlice).mutation(api.todos.complete, { todoId });
    const after1 = await t.run((ctx) => ctx.db.get(todoId));
    expect(after1?.completedAt).toBeDefined();
    const firstStamp = after1?.completedAt;

    // Second call should be a no-op (same completedAt)
    await t.withIdentity(asAlice).mutation(api.todos.complete, { todoId });
    const after2 = await t.run((ctx) => ctx.db.get(todoId));
    expect(after2?.completedAt).toBe(firstStamp);
  });

  test("rejects non-owner", async () => {
    const t = makeTest();
    await seedAlice(t);
    const todoId = await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "x",
      difficulty: "easy",
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
      t.withIdentity({ subject: "user_eve" }).mutation(api.todos.complete, { todoId }),
    ).rejects.toThrow(/Not your todo/);
  });

  test("rejects unknown todoId", async () => {
    const t = makeTest();
    await seedAlice(t);
    const todoId = await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "x",
      difficulty: "easy",
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(todoId);
    });

    await expect(t.withIdentity(asAlice).mutation(api.todos.complete, { todoId })).rejects.toThrow(
      /not found/i,
    );
  });
});
