import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";

// pnpm hoists node_modules in a way convex-test's auto-discovery can't follow,
// so we explicitly hand it the module map.
const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

function makeTest() {
  return convexTest(schema, modules);
}

// In-memory two-profile world. Each test starts fresh.
async function seedTwoProfiles(t: ReturnType<typeof makeTest>) {
  return await t.run(async (ctx) => {
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
    return { aliceId, bobId };
  });
}

const asAlice = { subject: "user_alice" };
const asBob = { subject: "user_bob" };

describe("friendships.request", () => {
  test("creates a pending row with canonical pair + requesterId", async () => {
    const t = makeTest();
    const { aliceId, bobId } = await seedTwoProfiles(t);

    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    const f = await t.run((ctx) => ctx.db.get(friendshipId));
    expect(f?.status).toBe("pending");
    expect(f?.requesterId).toBe(aliceId);
    // Canonical: pairLow < pairHigh lex order
    expect(f && f.pairLow < f.pairHigh).toBe(true);
    expect([f?.pairLow, f?.pairHigh].sort()).toEqual([aliceId, bobId].sort());
  });

  test("is idempotent — second request returns same id, no duplicates", async () => {
    const t = makeTest();
    const { bobId } = await seedTwoProfiles(t);

    const id1 = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });
    const id2 = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    expect(id1).toBe(id2);
    const all = await t.run((ctx) => ctx.db.query("friendships").collect());
    expect(all).toHaveLength(1);
  });

  test("returns same row regardless of which side sends second request", async () => {
    const t = makeTest();
    const { aliceId, bobId } = await seedTwoProfiles(t);

    const aliceReq = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });
    const bobReq = await t.withIdentity(asBob).mutation(api.friendships.request, {
      otherProfileId: aliceId,
    });

    expect(aliceReq).toBe(bobReq);
    const all = await t.run((ctx) => ctx.db.query("friendships").collect());
    expect(all).toHaveLength(1);
  });

  test("rejects self-pair", async () => {
    const t = makeTest();
    const { aliceId } = await seedTwoProfiles(t);

    await expect(
      t.withIdentity(asAlice).mutation(api.friendships.request, {
        otherProfileId: aliceId,
      }),
    ).rejects.toThrow(/yourself/);
  });

  test("rejects unauthenticated caller", async () => {
    const t = makeTest();
    const { bobId } = await seedTwoProfiles(t);

    await expect(t.mutation(api.friendships.request, { otherProfileId: bobId })).rejects.toThrow(
      /Unauthenticated/,
    );
  });
});

describe("friendships.accept", () => {
  test("non-requester accept transitions row to accepted + emits events for both sides", async () => {
    const t = makeTest();
    const { aliceId, bobId } = await seedTwoProfiles(t);
    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    await t.withIdentity(asBob).mutation(api.friendships.accept, { friendshipId });

    const f = await t.run((ctx) => ctx.db.get(friendshipId));
    expect(f?.status).toBe("accepted");
    expect(f?.acceptedAt).toBeDefined();

    const events = await t.run((ctx) =>
      ctx.db.query("activityEvents").withIndex("by_profile_created").collect(),
    );
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.kind === "friendship_accepted")).toBe(true);
    const profileIds = events.map((e) => e.profileId).sort();
    expect(profileIds).toEqual([aliceId, bobId].sort());
  });

  test("requester cannot accept their own request", async () => {
    const t = makeTest();
    const { bobId } = await seedTwoProfiles(t);
    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    await expect(
      t.withIdentity(asAlice).mutation(api.friendships.accept, { friendshipId }),
    ).rejects.toThrow(/Cannot accept your own/);
  });

  test("idempotent — accepting already-accepted row is a no-op", async () => {
    const t = makeTest();
    const { bobId } = await seedTwoProfiles(t);
    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });
    await t.withIdentity(asBob).mutation(api.friendships.accept, { friendshipId });

    // Second accept should not throw and not duplicate activity events
    await t.withIdentity(asBob).mutation(api.friendships.accept, { friendshipId });
    const events = await t.run((ctx) => ctx.db.query("activityEvents").collect());
    expect(events).toHaveLength(2);
  });

  test("non-participant cannot accept someone else's friendship", async () => {
    const t = makeTest();
    const { bobId } = await seedTwoProfiles(t);
    const eveId = await t.run((ctx) =>
      ctx.db.insert("profiles", {
        clerkUserId: "user_eve",
        username: "eve",
        usernameLower: "eve",
        timezone: "UTC",
        createdAt: 0,
      }),
    );
    void eveId; // silence unused — eve exists in db; we identify her via subject below
    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    await expect(
      t.withIdentity({ subject: "user_eve" }).mutation(api.friendships.accept, { friendshipId }),
    ).rejects.toThrow(/Not a participant/);
  });
});

describe("friendships.decline", () => {
  test("either side can decline; row is deleted", async () => {
    const t = makeTest();
    const { bobId } = await seedTwoProfiles(t);
    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    await t.withIdentity(asBob).mutation(api.friendships.decline, { friendshipId });
    const after = await t.run((ctx) => ctx.db.get(friendshipId));
    expect(after).toBeNull();
  });

  test("requester can also decline (cancel their own request)", async () => {
    const t = makeTest();
    const { bobId } = await seedTwoProfiles(t);
    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    await t.withIdentity(asAlice).mutation(api.friendships.decline, { friendshipId });
    const after = await t.run((ctx) => ctx.db.get(friendshipId));
    expect(after).toBeNull();
  });

  test("declining a missing row is idempotent — returns null", async () => {
    const t = makeTest();
    await seedTwoProfiles(t);
    // Use a syntactically-valid but non-existent id by inserting then deleting
    const ghostId = await t.run(async (ctx) => {
      const aliceId = await ctx.db
        .query("profiles")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "user_alice"))
        .unique()
        .then((p) => p!._id);
      const bobId = await ctx.db
        .query("profiles")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "user_bob"))
        .unique()
        .then((p) => p!._id);
      const id = await ctx.db.insert("friendships", {
        pairLow: aliceId < bobId ? aliceId : bobId,
        pairHigh: aliceId < bobId ? bobId : aliceId,
        requesterId: aliceId,
        status: "pending",
        createdAt: 0,
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t
      .withIdentity(asAlice)
      .mutation(api.friendships.decline, { friendshipId: ghostId });
    expect(result).toBeNull();
  });
});

describe("friendships.listForUser", () => {
  test("returns enriched rows with the OTHER profile + iAmRequester", async () => {
    const t = makeTest();
    const { aliceId, bobId } = await seedTwoProfiles(t);
    await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    const aliceList = await t.withIdentity(asAlice).query(api.friendships.listForUser, {});
    expect(aliceList).toHaveLength(1);
    const aliceRow = aliceList[0]!;
    expect(aliceRow.profile._id).toBe(bobId);
    expect(aliceRow.iAmRequester).toBe(true);

    const bobList = await t.withIdentity(asBob).query(api.friendships.listForUser, {});
    expect(bobList).toHaveLength(1);
    const bobRow = bobList[0]!;
    expect(bobRow.profile._id).toBe(aliceId);
    expect(bobRow.iAmRequester).toBe(false);
  });

  test("status filter narrows results", async () => {
    const t = makeTest();
    const { bobId } = await seedTwoProfiles(t);
    const friendshipId = await t.withIdentity(asAlice).mutation(api.friendships.request, {
      otherProfileId: bobId,
    });

    const beforeAccept = await t
      .withIdentity(asAlice)
      .query(api.friendships.listForUser, { status: "accepted" });
    expect(beforeAccept).toHaveLength(0);

    await t.withIdentity(asBob).mutation(api.friendships.accept, { friendshipId });

    const afterAccept = await t
      .withIdentity(asAlice)
      .query(api.friendships.listForUser, { status: "accepted" });
    expect(afterAccept).toHaveLength(1);

    const stillPending = await t
      .withIdentity(asAlice)
      .query(api.friendships.listForUser, { status: "pending" });
    expect(stillPending).toHaveLength(0);
  });

  test("empty list when caller has no friendships", async () => {
    const t = makeTest();
    await seedTwoProfiles(t);

    const list = await t.withIdentity(asAlice).query(api.friendships.listForUser, {});
    expect(list).toHaveLength(0);
  });
});

// Silence unused-import warnings on the Id type (helps when adding new tests later).
type _UnusedId = Id<"friendships">;
