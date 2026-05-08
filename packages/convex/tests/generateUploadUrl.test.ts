import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
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

describe("drops.generateUploadUrl", () => {
  test("returns a non-empty URL string for an authenticated caller", async () => {
    const t = makeTest();
    await seedAlice(t);

    const url = await t.withIdentity(asAlice).mutation(api.drops.generateUploadUrl, {});
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  test("rejects unauthenticated caller", async () => {
    const t = makeTest();
    await expect(t.mutation(api.drops.generateUploadUrl, {})).rejects.toThrow(/Unauthenticated/);
  });

  test("rejects caller without a profile row", async () => {
    const t = makeTest();
    await expect(
      t.withIdentity({ subject: "user_no_profile" }).mutation(api.drops.generateUploadUrl, {}),
    ).rejects.toThrow(/Profile not found/);
  });
});
