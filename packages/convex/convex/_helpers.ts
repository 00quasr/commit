import { dayKeyInTimezone } from "@commit/domain";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function resolveProfile(ctx: QueryCtx, profile: Doc<"profiles">) {
  let avatarUrl = profile.avatarUrl;
  if (profile.avatarFileId) {
    const url = await ctx.storage.getUrl(profile.avatarFileId);
    if (url) avatarUrl = url;
  }
  return {
    _id: profile._id,
    _creationTime: profile._creationTime,
    clerkUserId: profile.clerkUserId,
    username: profile.username,
    ...(profile.usernameLower !== undefined ? { usernameLower: profile.usernameLower } : {}),
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    timezone: profile.timezone,
    createdAt: profile.createdAt,
  };
}

const HABIT_COLORS = [
  "#5590D9",
  "#52B788",
  "#E05252",
  "#E09940",
  "#9B6EDE",
  "#40B4C4",
  "#D46BAA",
  "#C4D454",
];

export function resolveHabitColor(habitId: string, color: string | undefined | null): string {
  if (color) return color;
  let hash = 0;
  for (let i = 0; i < habitId.length; i++) {
    hash = (hash * 31 + habitId.charCodeAt(i)) & 0xffff;
  }
  return HABIT_COLORS[hash % HABIT_COLORS.length]!;
}

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
 * Throws a ConvexError if `tz` is not a valid IANA timezone. Constructing an
 * `Intl.DateTimeFormat` with an unknown/malformed zone throws a RangeError, so
 * this accepts exactly the set of zones that won't later throw in the day-key /
 * heatmap / streak paths that read a stored timezone. Call it on every write of
 * a client-supplied timezone (e.g. `profiles.upsert`).
 */
export function assertValidTimezone(tz: string): void {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format();
  } catch {
    throw new ConvexError({ code: "invalid_timezone", message: `invalid timezone "${tz}"` });
  }
}

/**
 * Like `dayKeyInTimezone` but never throws on a malformed stored timezone —
 * falls back to UTC instead. Used at cross-user fan-out points (e.g. building a
 * friend's heatmap from *their* stored timezone) so one user's bad timezone can
 * never throw another user's feed/profile query. New writes are validated by
 * `assertValidTimezone`; this guards any legacy/edge-case bad data.
 */
export function safeDayKeyInTimezone(unixMs: number, tz: string): string {
  try {
    return dayKeyInTimezone(unixMs, tz);
  } catch {
    return dayKeyInTimezone(unixMs, "UTC");
  }
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
 * Raw drops for a profile over the last year. Callers build per-habit or
 * per-profile heatmaps from this data using `buildHeatmap`.
 */
export async function fetchDropsForHeatmap(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  timezone: string,
): Promise<Doc<"drops">[]> {
  const sinceMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const sinceDayKey = safeDayKeyInTimezone(sinceMs, timezone);
  return ctx.db
    .query("drops")
    .withIndex("by_owner_day", (q) => q.eq("ownerId", profileId).gte("dayKey", sinceDayKey))
    .collect();
}

/**
 * Aggregates raw drops into a per-day entry with total count and per-habit
 * color bands, matching the Today-page heatmap style.
 */
export function buildMultiColorHeatmap(
  drops: Doc<"drops">[],
  habitColorMap: Map<string, string>,
): { dayKey: string; total: number; habits: { habitId: string; color: string }[] }[] {
  const totalByDay = new Map<string, number>();
  const dayHabitFirstAt = new Map<string, Map<string, number>>();

  for (const drop of drops) {
    totalByDay.set(drop.dayKey, (totalByDay.get(drop.dayKey) ?? 0) + 1);
    if (drop.habitId) {
      if (!dayHabitFirstAt.has(drop.dayKey)) dayHabitFirstAt.set(drop.dayKey, new Map());
      const dayMap = dayHabitFirstAt.get(drop.dayKey)!;
      const prev = dayMap.get(drop.habitId);
      if (prev === undefined || drop.createdAt < prev) dayMap.set(drop.habitId, drop.createdAt);
    }
  }

  return [...totalByDay.keys()].map((dayKey) => {
    const total = totalByDay.get(dayKey)!;
    const dayMap = dayHabitFirstAt.get(dayKey);
    const habits = dayMap
      ? [...dayMap.entries()]
          .sort((a, b) => a[1] - b[1])
          .slice(-3)
          .map(([habitId]) => ({
            habitId,
            color: resolveHabitColor(habitId, habitColorMap.get(habitId)),
          }))
      : [];
    return { dayKey, total, habits };
  });
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
