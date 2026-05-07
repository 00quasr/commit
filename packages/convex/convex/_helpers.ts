import { dayKeyInTimezone } from "@commit/domain";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Resolves the calling Clerk identity to a `profiles` row.
 * Throws if unauthenticated or if no profile exists yet (the mobile app
 * upserts a profile on first sign-in via `profiles.upsert`).
 */
export async function requireCallerProfile(ctx: QueryCtx | MutationCtx): Promise<Doc<"profiles">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!profile) {
    throw new Error("Profile not found — call profiles.upsert first");
  }
  return profile;
}

/**
 * Today's `dayKey` ("YYYY-MM-DD") in the caller's timezone.
 */
export function dayKeyForCaller(profile: Doc<"profiles">): string {
  return dayKeyInTimezone(Date.now(), profile.timezone);
}

/**
 * True if the given profile has at least one drop with the given dayKey.
 * Uses the `by_owner_day` index on `drops`.
 */
export async function hasDroppedToday(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  dayKey: string,
): Promise<boolean> {
  const row = await ctx.db
    .query("drops")
    .withIndex("by_owner_day", (q) => q.eq("ownerId", profileId).eq("dayKey", dayKey))
    .first();
  return row !== null;
}

/**
 * Count of drops created by the caller's friends today, regardless of whether
 * the caller has dropped. Used for the locked-feed "blurredCount" payload.
 */
export async function countTodaysFriendDrops(
  _ctx: QueryCtx | MutationCtx,
  _callerId: Id<"profiles">,
  _dayKey: string,
): Promise<number> {
  throw new Error("not implemented — wired up in commit 7");
}

/**
 * The caller's friends' drops for the given dayKey, only callable when the
 * caller has dropped today (enforced one level up in the query handler).
 */
export async function fetchFriendDropsToday(
  _ctx: QueryCtx | MutationCtx,
  _callerId: Id<"profiles">,
  _dayKey: string,
): Promise<Doc<"drops">[]> {
  throw new Error("not implemented — wired up in commit 7");
}
