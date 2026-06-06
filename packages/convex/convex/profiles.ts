import { ConvexError, v } from "convex/values";
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

/**
 * Live availability check for the choose-username onboarding screen. The same
 * format rule + uniqueness check that `upsert` enforces, exposed as a fast
 * read so the client can render a typeahead indicator without going through
 * the mutation (which would throw and surface as a dev LogBox error).
 */
export const usernameAvailable = query({
  args: { username: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const usernameLower = args.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(usernameLower)) return false;

    const identity = await ctx.auth.getUserIdentity();
    const ownClerkUserId = identity?.subject;

    const collision = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("usernameLower", usernameLower))
      .unique();
    // The caller's own current username (if any) counts as available so the
    // Settings editor can show "Available" for the value already in the input.
    if (!collision) return true;
    return collision.clerkUserId === ownClerkUserId;
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
      throw new ConvexError({
        code: "username_taken",
        message: `username "${args.username}" is already taken`,
      });
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
