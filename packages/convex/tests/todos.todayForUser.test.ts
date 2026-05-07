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

describe("todos.todayForUser", () => {
  test("returns today's todos newest first", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T08:00:00Z"));

    await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "first",
      difficulty: "easy",
    });
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "second",
      difficulty: "medium",
    });
    vi.setSystemTime(new Date("2026-05-07T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "third",
      difficulty: "hard",
    });

    const list = await t.withIdentity(asAlice).query(api.todos.todayForUser, {});
    expect(list.map((t) => t.text)).toEqual(["third", "second", "first"]);
  });

  test("excludes other users' todos", async () => {
    const t = makeTest();
    await seedAlice(t);
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

    await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "alice's todo",
      difficulty: "easy",
    });
    await t.withIdentity({ subject: "user_eve" }).mutation(api.todos.create, {
      text: "eve's todo",
      difficulty: "easy",
    });

    const aliceList = await t.withIdentity(asAlice).query(api.todos.todayForUser, {});
    expect(aliceList).toHaveLength(1);
    expect(aliceList[0]?.text).toBe("alice's todo");
  });

  test("excludes todos from other days (different dayKey)", async () => {
    const t = makeTest();
    await seedAlice(t);

    vi.useFakeTimers().setSystemTime(new Date("2026-05-06T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "yesterday",
      difficulty: "easy",
    });

    vi.setSystemTime(new Date("2026-05-07T12:00:00Z"));
    await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "today",
      difficulty: "easy",
    });

    const list = await t.withIdentity(asAlice).query(api.todos.todayForUser, {});
    expect(list).toHaveLength(1);
    expect(list[0]?.text).toBe("today");
  });

  test("includes both open and completed todos", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const todoId = await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "done",
      difficulty: "easy",
    });
    await t.withIdentity(asAlice).mutation(api.todos.create, {
      text: "open",
      difficulty: "easy",
    });
    await t.withIdentity(asAlice).mutation(api.todos.complete, { todoId });

    const list = await t.withIdentity(asAlice).query(api.todos.todayForUser, {});
    expect(list).toHaveLength(2);
    const completed = list.find((t) => t.text === "done");
    expect(completed?.completedAt).toBeDefined();
  });

  test("returns empty array when no todos today", async () => {
    const t = makeTest();
    await seedAlice(t);
    vi.useFakeTimers().setSystemTime(new Date("2026-05-07T12:00:00Z"));

    const list = await t.withIdentity(asAlice).query(api.todos.todayForUser, {});
    expect(list).toEqual([]);
  });

  test("rejects unauthenticated caller", async () => {
    const t = makeTest();
    await expect(t.query(api.todos.todayForUser, {})).rejects.toThrow(/Unauthenticated/);
  });
});
