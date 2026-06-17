import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCallerProfile, resolveProfile } from "./_helpers";

const profileShape = v.object({
  _id: v.id("profiles"),
  _creationTime: v.number(),
  username: v.string(),
  usernameLower: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  timezone: v.string(),
  createdAt: v.number(),
});

export const me = query({
  args: {},
  returns: v.union(v.null(), profileShape),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!profile) return null;
    return resolveProfile(ctx, profile);
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

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireCallerProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateAvatar = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    await ctx.db.patch(me._id, { avatarFileId: args.storageId });
    return null;
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
    if (!profile) return null;
    return resolveProfile(ctx, profile);
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
    // Require auth — anonymous prefix search lets anyone enumerate the whole
    // username directory, which is the harvest vector behind COM-136. The
    // friends-screen search field always runs signed-in.
    const me = await requireCallerProfile(ctx);
    const lower = args.prefix.replace(/^@/, "").trim().toLowerCase();
    if (!lower) return [];
    const limit = Math.min(args.limit ?? SEARCH_LIMIT_DEFAULT, SEARCH_LIMIT_MAX);
    // Strings ordered alphabetically: usernames starting with `lower` are in
    // [lower, lower + "￿"). Convex withIndex gte/lt yields exactly that
    // range from the by_username_lower index.
    const upper = lower + "￿";
    // Over-fetch by 1 so excluding self still returns `limit` rows when self
    // matches the prefix.
    const rows = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) =>
        q.gte("usernameLower", lower).lt("usernameLower", upper),
      )
      .take(limit + 1);
    // Exclude the caller so "add friend" never points at self.
    const filtered = rows.filter((p) => p._id !== me._id);
    return Promise.all(filtered.slice(0, limit).map((p) => resolveProfile(ctx, p)));
  },
});
