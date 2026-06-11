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
});

describe("profiles.upsert timezone validation", () => {
  test("rejects a malformed timezone instead of storing it", async () => {
    const t = makeTest();
    await expect(
      t
        .withIdentity({ subject: "user_mallory" })
        .mutation(api.profiles.upsert, { username: "mallory", timezone: "Not/AZone" }),
    ).rejects.toThrow(/invalid timezone/);
  });

  test("accepts a valid IANA timezone and stores it", async () => {
    const t = makeTest();
    const id = await t
      .withIdentity({ subject: "user_dana" })
      .mutation(api.profiles.upsert, { username: "dana", timezone: "Europe/Berlin" });
    const profile = await t.run((ctx) => ctx.db.get(id));
    expect(profile?.timezone).toBe("Europe/Berlin");
  });

  test("accepts UTC", async () => {
    const t = makeTest();
    const id = await t
      .withIdentity({ subject: "user_uli" })
      .mutation(api.profiles.upsert, { username: "uli", timezone: "UTC" });
    const profile = await t.run((ctx) => ctx.db.get(id));
    expect(profile?.timezone).toBe("UTC");
  });
});
