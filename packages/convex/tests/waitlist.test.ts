import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");
function makeTest() {
  return convexTest(schema, modules);
}

describe("waitlist.add", () => {
  test("accepts a fresh email", async () => {
    const t = makeTest();
    const result = await t.mutation(api.waitlist.add, { email: "alice@example.com" });
    expect(result).toEqual({ status: "ok" });

    const rows = await t.run((ctx) => ctx.db.query("waitlist").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("alice@example.com");
    expect(rows[0]?.emailLower).toBe("alice@example.com");
  });

  test("returns duplicate on second add (case-insensitive)", async () => {
    const t = makeTest();
    await t.mutation(api.waitlist.add, { email: "alice@example.com" });
    const result = await t.mutation(api.waitlist.add, { email: "ALICE@example.com" });
    expect(result).toEqual({ status: "duplicate" });

    const rows = await t.run((ctx) => ctx.db.query("waitlist").collect());
    expect(rows).toHaveLength(1);
  });

  test("rejects invalid email shape", async () => {
    const t = makeTest();
    const result = await t.mutation(api.waitlist.add, { email: "not-an-email" });
    expect(result).toEqual({ status: "invalid" });

    const rows = await t.run((ctx) => ctx.db.query("waitlist").collect());
    expect(rows).toHaveLength(0);
  });

  test("rejects empty email", async () => {
    const t = makeTest();
    const result = await t.mutation(api.waitlist.add, { email: "   " });
    expect(result).toEqual({ status: "invalid" });
  });

  test("silently ok's a honeypot hit without storing", async () => {
    const t = makeTest();
    const result = await t.mutation(api.waitlist.add, {
      email: "bot@example.com",
      honeypot: "i-am-a-bot",
    });
    expect(result).toEqual({ status: "ok" });

    const rows = await t.run((ctx) => ctx.db.query("waitlist").collect());
    expect(rows).toHaveLength(0);
  });

  test("stores source and utm when provided", async () => {
    const t = makeTest();
    await t.mutation(api.waitlist.add, {
      email: "carol@example.com",
      source: "hero",
      utm: { source: "x", medium: "social", campaign: "launch" },
    });
    const rows = await t.run((ctx) => ctx.db.query("waitlist").collect());
    expect(rows[0]?.source).toBe("hero");
    expect(rows[0]?.utm).toEqual({ source: "x", medium: "social", campaign: "launch" });
  });
});

describe("waitlist.count", () => {
  test("returns 0 when empty", async () => {
    const t = makeTest();
    const n = await t.query(api.waitlist.count, {});
    expect(n).toBe(0);
  });

  test("counts inserted rows", async () => {
    const t = makeTest();
    await t.mutation(api.waitlist.add, { email: "a@example.com" });
    await t.mutation(api.waitlist.add, { email: "b@example.com" });
    await t.mutation(api.waitlist.add, { email: "a@example.com" }); // duplicate, no-op
    const n = await t.query(api.waitlist.count, {});
    expect(n).toBe(2);
  });
});
