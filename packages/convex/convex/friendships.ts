import { canonicalPair } from "@commit/domain";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCallerProfile } from "./_helpers";

const profileShape = v.object({
  _id: v.id("profiles"),
  _creationTime: v.number(),
  clerkUserId: v.string(),
  username: v.string(),
  usernameLower: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  timezone: v.string(),
  createdAt: v.number(),
});

const friendshipShape = v.object({
  _id: v.id("friendships"),
  _creationTime: v.number(),
  pairLow: v.id("profiles"),
  pairHigh: v.id("profiles"),
  requesterId: v.id("profiles"),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  createdAt: v.number(),
  acceptedAt: v.optional(v.number()),
});

export const request = mutation({
  args: { otherProfileId: v.id("profiles") },
  returns: v.id("friendships"),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    if (me._id === args.otherProfileId) {
      throw new Error("Cannot send a friend request to yourself");
    }

    const other = await ctx.db.get(args.otherProfileId);
    if (!other) {
      throw new Error("Other profile not found");
    }

    const { low, high } = canonicalPair(me._id, args.otherProfileId);

    // Idempotent: if a row already exists for this pair (pending or accepted),
    // return it without creating a duplicate.
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) => q.eq("pairLow", low).eq("pairHigh", high))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("friendships", {
      pairLow: low,
      pairHigh: high,
      requesterId: me._id,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const accept = mutation({
  args: { friendshipId: v.id("friendships") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const f = await ctx.db.get(args.friendshipId);
    if (!f) {
      throw new Error("Friendship not found");
    }
    if (f.status === "accepted") {
      return null; // idempotent — already accepted
    }
    if (f.pairLow !== me._id && f.pairHigh !== me._id) {
      throw new Error("Not a participant in this friendship");
    }
    if (f.requesterId === me._id) {
      throw new Error("Cannot accept your own friend request — wait for the other side");
    }

    const now = Date.now();
    await ctx.db.patch(args.friendshipId, {
      status: "accepted",
      acceptedAt: now,
    });

    // Emit activity events for both sides — useful for the activity feed in Phase 4
    // and as a sanity check if userStats ever drifts.
    const otherId = f.pairLow === me._id ? f.pairHigh : f.pairLow;
    await ctx.db.insert("activityEvents", {
      profileId: me._id,
      kind: "friendship_accepted",
      payload: { friendshipId: args.friendshipId, otherProfileId: otherId },
      createdAt: now,
    });
    await ctx.db.insert("activityEvents", {
      profileId: otherId,
      kind: "friendship_accepted",
      payload: { friendshipId: args.friendshipId, otherProfileId: me._id },
      createdAt: now,
    });

    return null;
  },
});

export const decline = mutation({
  args: { friendshipId: v.id("friendships") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const f = await ctx.db.get(args.friendshipId);
    if (!f) {
      // Idempotent — already gone.
      return null;
    }
    if (f.pairLow !== me._id && f.pairHigh !== me._id) {
      throw new Error("Not a participant in this friendship");
    }
    await ctx.db.delete(args.friendshipId);
    return null;
  },
});

export const listForUser = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("accepted"))),
  },
  returns: v.array(
    v.object({
      friendship: friendshipShape,
      profile: profileShape,
      iAmRequester: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);

    // Caller might be on either side of the canonical pair, so fan-out across
    // both single-side indexes and union. Post-filter on status keeps the code
    // simple — friendships per user stays small (cap ~30 in V2).
    const [lowMatches, highMatches] = await Promise.all([
      ctx.db
        .query("friendships")
        .withIndex("by_low", (q) => q.eq("pairLow", me._id))
        .collect(),
      ctx.db
        .query("friendships")
        .withIndex("by_high", (q) => q.eq("pairHigh", me._id))
        .collect(),
    ]);

    const all = [...lowMatches, ...highMatches];
    const filtered = args.status === undefined ? all : all.filter((f) => f.status === args.status);

    const enriched = await Promise.all(
      filtered.map(async (f) => {
        const otherId = f.pairLow === me._id ? f.pairHigh : f.pairLow;
        const profile = await ctx.db.get(otherId);
        if (!profile) return null; // shouldn't happen; defensive
        return {
          friendship: f,
          profile,
          iAmRequester: f.requesterId === me._id,
        };
      }),
    );

    return enriched.filter((e): e is NonNullable<typeof e> => e !== null);
  },
});
