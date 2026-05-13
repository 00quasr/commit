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
 * IDs of profiles the caller has accepted as friends. Both directions of the
 * canonical pair are merged.
 */
export async function getAcceptedFriendIds(
  ctx: QueryCtx | MutationCtx,
  callerId: Id<"profiles">,
): Promise<Id<"profiles">[]> {
  const [lowSide, highSide] = await Promise.all([
    ctx.db
      .query("friendships")
      .withIndex("by_low", (q) => q.eq("pairLow", callerId).eq("status", "accepted"))
      .collect(),
    ctx.db
      .query("friendships")
      .withIndex("by_high", (q) => q.eq("pairHigh", callerId).eq("status", "accepted"))
      .collect(),
  ]);
  const out: Id<"profiles">[] = [];
  for (const f of lowSide) out.push(f.pairHigh);
  for (const f of highSide) out.push(f.pairLow);
  return out;
}

/**
 * Drops by the caller's accepted friends with the given dayKey, excluding
 * `private` drops (those count for streak/XP only — never visible to others).
 * Sorted by createdAt descending so newest drops appear first in the feed.
 */
export async function fetchFriendDropsToday(
  ctx: QueryCtx | MutationCtx,
  callerId: Id<"profiles">,
  dayKey: string,
): Promise<Doc<"drops">[]> {
  const friendIds = await getAcceptedFriendIds(ctx, callerId);
  const drops: Doc<"drops">[] = [];
  for (const friendId of friendIds) {
    const friendDrops = await ctx.db
      .query("drops")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", friendId).eq("dayKey", dayKey))
      .collect();
    for (const d of friendDrops) {
      if (d.visibility !== "private") drops.push(d);
    }
  }
  drops.sort((a, b) => b.createdAt - a.createdAt);
  return drops;
}

/**
 * Year-long drop heatmap for a profile. Powers the MiniHeatmap in DropCard.
 * Same logic as the `heatmapForProfile` query, extracted so it can be called
 * inline from other query handlers.
 */
export async function fetchHeatmapForProfile(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  timezone: string,
): Promise<{ dayKey: string; count: number }[]> {
  const sinceMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const sinceDayKey = dayKeyInTimezone(sinceMs, timezone);
  const drops = await ctx.db
    .query("drops")
    .withIndex("by_owner_day", (q) => q.eq("ownerId", profileId).gte("dayKey", sinceDayKey))
    .collect();
  const counts = new Map<string, number>();
  for (const d of drops) {
    counts.set(d.dayKey, (counts.get(d.dayKey) ?? 0) + 1);
  }
  return [...counts.entries()].map(([dayKey, count]) => ({ dayKey, count }));
}

/**
 * Count of drops that would appear in the feed if it were unlocked. Used by
 * the locked-feed payload so the UI can render "12 friends dropped today".
 */
export async function countTodaysFriendDrops(
  ctx: QueryCtx | MutationCtx,
  callerId: Id<"profiles">,
  dayKey: string,
): Promise<number> {
  const drops = await fetchFriendDropsToday(ctx, callerId, dayKey);
  return drops.length;
}
