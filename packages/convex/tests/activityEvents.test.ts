import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");
function makeTest() {
  return convexTest(schema, modules);
}

const asAlice = { subject: "user_alice" };
const asBob = { subject: "user_bob" };
const asCarol = { subject: "user_carol" };

async function seedProfiles(t: ReturnType<typeof makeTest>) {
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
    const carolId = await ctx.db.insert("profiles", {
      clerkUserId: "user_carol",
      username: "carol",
      usernameLower: "carol",
      timezone: "UTC",
      createdAt: 0,
    });
    return { aliceId, bobId, carolId };
  });
}

async function makeFriends(
  t: ReturnType<typeof makeTest>,
  requesterIdentity: { subject: string },
  accepterIdentity: { subject: string },
  otherProfileId: Awaited<ReturnType<typeof seedProfiles>>["aliceId"],
) {
  const friendshipId = await t
    .withIdentity(requesterIdentity)
    .mutation(api.friendships.request, { otherProfileId });
  await t.withIdentity(accepterIdentity).mutation(api.friendships.accept, { friendshipId });
}

describe("habits.create — habit_created emission", () => {
  test("emits a habit_created event with habit payload", async () => {
    const t = makeTest();
    const { aliceId } = await seedProfiles(t);

    const habitId = await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "read 20m",
      cycleDays: 1,
      color: "#5590D9",
    });

    const events = await t.run((ctx) =>
      ctx.db
        .query("activityEvents")
        .withIndex("by_profile_created", (q) => q.eq("profileId", aliceId))
        .collect(),
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("habit_created");
    expect((events[0]?.payload as { habitId: string }).habitId).toBe(habitId);
    expect((events[0]?.payload as { text: string }).text).toBe("read 20m");
  });
});

describe("activityEvents.feedForUser", () => {
  test("returns the caller's own habit_created event", async () => {
    const t = makeTest();
    await seedProfiles(t);
    await t.withIdentity(asAlice).mutation(api.habits.create, {
      text: "read 20m",
      cycleDays: 1,
      color: "#5590D9",
    });

    const feed = await t.withIdentity(asAlice).query(api.activityEvents.feedForUser, {});
    expect(feed).toHaveLength(1);
    expect(feed[0]?.kind).toBe("habit_created");
    expect(feed[0]?.author.username).toBe("alice");
    expect(feed[0]?.habit?.text).toBe("read 20m");
  });

  test("includes events from accepted friends", async () => {
    const t = makeTest();
    const { aliceId, bobId } = await seedProfiles(t);

    await makeFriends(t, asAlice, asBob, bobId);
    await t.withIdentity(asBob).mutation(api.habits.create, {
      text: "run 30m",
      cycleDays: 1,
      color: "#FF6B6B",
    });

    const aliceFeed = await t.withIdentity(asAlice).query(api.activityEvents.feedForUser, {});
    // Alice should see Bob's habit_created. (Friendship accept also fires
    // friendship_accepted events, but feedForUser filters them out.)
    const bobsHabit = aliceFeed.find((e) => e.kind === "habit_created" && e.author._id === bobId);
    expect(bobsHabit).toBeDefined();
    expect(bobsHabit?.habit?.text).toBe("run 30m");
    // Alice's own no events yet.
    expect(aliceFeed.every((e) => e.author._id !== aliceId || e.kind !== "habit_created")).toBe(
      true,
    );
  });

  test("excludes events from strangers (non-friends)", async () => {
    const t = makeTest();
    const { carolId } = await seedProfiles(t);

    await t.withIdentity(asCarol).mutation(api.habits.create, {
      text: "stretch 10m",
      cycleDays: 1,
      color: "#FFD93D",
    });

    const aliceFeed = await t.withIdentity(asAlice).query(api.activityEvents.feedForUser, {});
    expect(aliceFeed.find((e) => e.author._id === carolId)).toBeUndefined();
  });

  test("excludes events with no surviving habit", async () => {
    const t = makeTest();
    const { bobId } = await seedProfiles(t);
    await makeFriends(t, asAlice, asBob, bobId);

    const habitId = await t.withIdentity(asBob).mutation(api.habits.create, {
      text: "to be deleted",
      cycleDays: 1,
      color: "#5590D9",
    });
    // Hard-delete the habit row to simulate a stale event referencing a gone habit.
    await t.run((ctx) => ctx.db.delete(habitId));

    const aliceFeed = await t.withIdentity(asAlice).query(api.activityEvents.feedForUser, {});
    expect(aliceFeed.find((e) => e.author._id === bobId)).toBeUndefined();
  });
});
