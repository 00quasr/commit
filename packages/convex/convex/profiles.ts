import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

// Looks up a profile by exact username (case-insensitive, accepts optional
// leading "@"). Returns null if no user matches.
export const getByUsername = query({
  args: { username: v.string() },
  returns: v.union(v.null(), profileShape),
  handler: async (ctx, args) => {
    const lower = args.username.replace(/^@/, "").trim().toLowerCase();
    if (!lower) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("usernameLower", lower))
      .unique();
    return profile;
  },
});

// Prefix-search across usernames using a range scan on the lowercase index.
// Returns up to `limit` matches starting with the prefix, sorted by index
// (alphabetical on usernameLower). Empty prefix returns []. Used by the
// friends-screen search field for live results as you type.
const SEARCH_LIMIT_DEFAULT = 10;
const SEARCH_LIMIT_MAX = 25;
export const searchByUsernamePrefix = query({
  args: { prefix: v.string(), limit: v.optional(v.number()) },
  returns: v.array(profileShape),
  handler: async (ctx, args) => {
    const lower = args.prefix.replace(/^@/, "").trim().toLowerCase();
    if (!lower) return [];
    const limit = Math.min(args.limit ?? SEARCH_LIMIT_DEFAULT, SEARCH_LIMIT_MAX);
    // Strings ordered alphabetically: usernames starting with `lower` are in
    // [lower, lower + "￿"). Convex withIndex gte/lt yields exactly that
    // range from the by_username_lower index.
    const upper = lower + "￿";
    // Exclude the caller from results so "add friend" never points at self.
    // Unauthenticated callers (no identity) still see results, just no exclusion.
    const identity = await ctx.auth.getUserIdentity();
    // Over-fetch by 1 so excluding self still returns `limit` rows when self
    // matches the prefix.
    const rows = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) =>
        q.gte("usernameLower", lower).lt("usernameLower", upper),
      )
      .take(limit + 1);
    const filtered = identity ? rows.filter((p) => p.clerkUserId !== identity.subject) : rows;
    return filtered.slice(0, limit);
  },
});
