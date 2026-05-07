import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireCallerProfile } from "./_helpers";

const userStatsShape = v.object({
  _id: v.id("userStats"),
  _creationTime: v.number(),
  profileId: v.id("profiles"),
  totalXp: v.number(),
  level: v.number(),
  streak: v.number(),
  longestStreak: v.number(),
  graceCardsAvailable: v.number(),
  lastDropDayKey: v.optional(v.string()),
  totalDrops: v.number(),
  updatedAt: v.number(),
});

/**
 * Returns the caller's userStats row, or null if they haven't dropped yet
 * (the row is created on first drops.create).
 */
export const forCaller = query({
  args: {},
  returns: v.union(v.null(), userStatsShape),
  handler: async (ctx) => {
    const me = await requireCallerProfile(ctx);
    return await ctx.db
      .query("userStats")
      .withIndex("by_profile", (q) => q.eq("profileId", me._id))
      .unique();
  },
});

/**
 * Returns userStats for any profile. Used by public profile pages and the
 * friend-request preflight UI ("alice — 12-day streak").
 */
export const forProfile = query({
  args: { profileId: v.id("profiles") },
  returns: v.union(v.null(), userStatsShape),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userStats")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .unique();
  },
});
