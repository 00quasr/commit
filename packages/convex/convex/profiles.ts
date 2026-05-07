import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("profiles"),
      _creationTime: v.number(),
      clerkUserId: v.string(),
      username: v.string(),
      usernameLower: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      timezone: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    return profile;
  },
});

export const upsert = mutation({
  args: {
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    timezone: v.string(),
  },
  returns: v.id("profiles"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const usernameLower = args.username.toLowerCase();

    // Username uniqueness — public profile URLs at commit.app/{username} require it.
    const collision = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("usernameLower", usernameLower))
      .unique();
    if (collision && collision.clerkUserId !== identity.subject) {
      throw new Error(`username "${args.username}" is already taken`);
    }

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    const patch = {
      username: args.username,
      usernameLower,
      timezone: args.timezone,
      ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      clerkUserId: identity.subject,
      createdAt: Date.now(),
      ...patch,
    });
  },
});
