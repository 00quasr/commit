import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

function makeTest() {
  return convexTest(schema, modules);
}

async function seedProfile(t: ReturnType<typeof makeTest>, username: string) {
  return await t.run((ctx) =>
    ctx.db.insert("profiles", {
      clerkUserId: `user_${username}`,
      username,
      usernameLower: username.toLowerCase(),
      timezone: "UTC",
      createdAt: 0,
    }),
  );
}

describe("profiles.getByUsername", () => {
  test("finds a user by exact lowercase match", async () => {
    const t = makeTest();
    const aliceId = await seedProfile(t, "alice");

    const result = await t.query(api.profiles.getByUsername, { username: "alice" });
    expect(result?._id).toBe(aliceId);
  });

  test("normalizes case before lookup", async () => {
    const t = makeTest();
    const aliceId = await seedProfile(t, "Alice");

    const result = await t.query(api.profiles.getByUsername, { username: "ALICE" });
    expect(result?._id).toBe(aliceId);
  });

  test("strips a leading @", async () => {
    const t = makeTest();
    const aliceId = await seedProfile(t, "alice");

    const result = await t.query(api.profiles.getByUsername, { username: "@alice" });
    expect(result?._id).toBe(aliceId);
  });

  test("trims surrounding whitespace", async () => {
    const t = makeTest();
    const aliceId = await seedProfile(t, "alice");

    const result = await t.query(api.profiles.getByUsername, { username: "  alice  " });
    expect(result?._id).toBe(aliceId);
  });

  test("returns null for unknown username", async () => {
    const t = makeTest();
    await seedProfile(t, "alice");

    const result = await t.query(api.profiles.getByUsername, { username: "bob" });
    expect(result).toBeNull();
  });

  test("returns null for empty input", async () => {
    const t = makeTest();
    await seedProfile(t, "alice");

    const result = await t.query(api.profiles.getByUsername, { username: "@" });
    expect(result).toBeNull();
  });

  test("does not leak clerkUserId in the returned shape (COM-136)", async () => {
    const t = makeTest();
    await seedProfile(t, "alice");

    const result = await t.query(api.profiles.getByUsername, { username: "alice" });
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("clerkUserId");
  });
});

describe("profiles.searchByUsernamePrefix (COM-136)", () => {
  test("requires authentication", async () => {
    const t = makeTest();
    await seedProfile(t, "alice");

    await expect(t.query(api.profiles.searchByUsernamePrefix, { prefix: "al" })).rejects.toThrow(
      /unauthenticated/i,
    );
  });

  test("returns prefix matches for a signed-in caller, excluding self, without clerkUserId", async () => {
    const t = makeTest();
    await seedProfile(t, "alice");
    await seedProfile(t, "alan");
    await seedProfile(t, "bob");

    const results = await t
      .withIdentity({ subject: "user_alice" })
      .query(api.profiles.searchByUsernamePrefix, { prefix: "al" });

    // "al" matches alice + alan; self (alice) is excluded.
    expect(results.map((p) => p.username)).toEqual(["alan"]);
    expect(results[0]).not.toHaveProperty("clerkUserId");
  });
});
