import { canonicalPair, dayKeyInTimezone, shouldLockFeed, streakAfterDrop } from "@commit/domain";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  buildMultiColorHeatmap,
  countTodaysFriendDrops,
  dayKeyForCaller,
  fetchDropsForHeatmap,
  fetchFriendDropsToday,
  resolveHabitColor,
  hasDroppedToday,
  requireCallerProfile,
  resolveProfile,
} from "./_helpers";

/**
 * Returns a one-time signed URL the client can POST a file to, getting back
 * a `{ storageId }` payload. The storageId becomes `photoFileId` on the
 * subsequent `drops.create` call.
 *
 * Auth-gated: only signed-in profiles can request upload URLs. Each URL is
 * single-use and expires server-side after upload.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireCallerProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const dropShape = v.object({
  _id: v.id("drops"),
  _creationTime: v.number(),
  ownerId: v.id("profiles"),
  habitId: v.optional(v.id("habits")),
  caption: v.string(),
  photoFileId: v.optional(v.id("_storage")),
  dayKey: v.string(),
  createdAt: v.number(),
  visibility: v.union(v.literal("public"), v.literal("friends"), v.literal("private")),
  reactionCount: v.number(),
  viewCount: v.number(),
  streakAtDrop: v.optional(v.number()),
  totalDropsAtDrop: v.optional(v.number()),
});

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

const heatmapEntryShape = v.object({
  dayKey: v.string(),
  total: v.number(),
  habits: v.array(v.object({ habitId: v.string(), color: v.string() })),
});

const enrichedDropShape = v.object({
  drop: dropShape,
  author: profileShape,
  // Resolved Convex storage URLs. Server-side resolution avoids N+1 round-trips
  // from the mobile client; URLs are signed and expire (Convex default ~1h).
  photoUrl: v.union(v.string(), v.null()),
  // Year-long drop heatmap for the author — powers the MiniHeatmap in DropCard.
  authorHeatmap: v.array(heatmapEntryShape),
  habitColor: v.union(v.string(), v.null()),
  habitText: v.union(v.string(), v.null()),
});

async function fetchHabitColorMap(
  ctx: QueryCtx | MutationCtx,
  drops: Doc<"drops">[],
): Promise<Map<string, string>> {
  const seenIds = new Set<string>();
  const map = new Map<string, string>();
  await Promise.all(
    drops
      .filter((d) => {
        if (!d.habitId || seenIds.has(d.habitId)) return false;
        seenIds.add(d.habitId);
        return true;
      })
      .map(async (drop) => {
        const habit = await ctx.db.get(drop.habitId!);
        if (habit?.color) map.set(drop.habitId!, habit.color);
      }),
  );
  return map;
}

const MAX_CAPTION = 100;
const STREAK_MILESTONES = new Set([7, 14, 30, 60, 100]);

export const create = mutation({
  args: {
    habitId: v.optional(v.id("habits")),
    caption: v.string(),
    visibility: v.union(v.literal("public"), v.literal("friends"), v.literal("private")),
    photoFileId: v.optional(v.id("_storage")),
  },
  returns: v.id("drops"),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);

    // Validate caption.
    if (args.caption.length > MAX_CAPTION) {
      throw new Error(`caption exceeds ${MAX_CAPTION} chars`);
    }

    // Verify linked habit if provided.
    if (args.habitId) {
      const habit = await ctx.db.get(args.habitId);
      if (!habit) throw new Error("Habit not found");
      if (habit.ownerId !== me._id) throw new Error("Not your habit");
      if (habit.archived) throw new Error("Habit is archived");
    }

    const dayKey = dayKeyForCaller(me);
    const now = Date.now();

    // Read userStats (or default for first-ever drop).
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_profile", (q) => q.eq("profileId", me._id))
      .unique();

    const previousStreak = stats?.streak ?? 0;
    const previousLongest = stats?.longestStreak ?? 0;
    const previousGraceCards = stats?.graceCardsAvailable ?? 0;
    const previousTotalDrops = stats?.totalDrops ?? 0;
    const lastDropDayKey = stats?.lastDropDayKey;

    // Domain rules — pure functions, deterministic, unit-tested.
    const streakResult = streakAfterDrop({
      previousStreak,
      lastDropDayKey,
      newDropDayKey: dayKey,
      graceCardsAvailable: previousGraceCards,
    });

    const newLongestStreak = Math.max(previousLongest, streakResult.newStreak);

    // Grace card economics: hold at most 1; earn at the 6→7 streak transition,
    // consume on a gap day. Per VISION §5.3.
    let newGraceCards = previousGraceCards;
    if (streakResult.consumeGraceCard) {
      newGraceCards -= 1;
    }
    const earnedGraceCard =
      previousStreak === 6 && streakResult.newStreak === 7 && newGraceCards === 0;
    if (earnedGraceCard) {
      newGraceCards += 1;
    }

    // Insert the drop.
    const dropId = await ctx.db.insert("drops", {
      ownerId: me._id,
      ...(args.habitId !== undefined ? { habitId: args.habitId } : {}),
      caption: args.caption,
      ...(args.photoFileId !== undefined ? { photoFileId: args.photoFileId } : {}),
      dayKey,
      createdAt: now,
      visibility: args.visibility,
      reactionCount: 0,
      viewCount: 0,
      streakAtDrop: streakResult.newStreak,
      totalDropsAtDrop: previousTotalDrops + 1,
    });

    // Update habit.lastDropDayKey so the next dueToday query reflects this drop.
    if (args.habitId) {
      await ctx.db.patch(args.habitId, { lastDropDayKey: dayKey });
    }

    // Upsert userStats (denormalized for fast feed/profile reads).
    const statsPatch = {
      streak: streakResult.newStreak,
      longestStreak: newLongestStreak,
      graceCardsAvailable: newGraceCards,
      lastDropDayKey: dayKey,
      totalDrops: previousTotalDrops + 1,
      updatedAt: now,
    };
    if (stats) {
      await ctx.db.patch(stats._id, statsPatch);
    } else {
      await ctx.db.insert("userStats", { profileId: me._id, ...statsPatch });
    }

    // Activity events. Always emit drop_created. Conditionally emit
    // streak_milestone, grace_card_earned, grace_card_consumed.
    await ctx.db.insert("activityEvents", {
      profileId: me._id,
      kind: "drop_created",
      payload: { dropId, dayKey, streakAfter: streakResult.newStreak },
      createdAt: now,
    });

    if (
      STREAK_MILESTONES.has(streakResult.newStreak) &&
      streakResult.newStreak !== previousStreak
    ) {
      await ctx.db.insert("activityEvents", {
        profileId: me._id,
        kind: "streak_milestone",
        payload: { streak: streakResult.newStreak },
        createdAt: now,
      });
    }

    if (earnedGraceCard) {
      await ctx.db.insert("activityEvents", {
        profileId: me._id,
        kind: "grace_card_earned",
        payload: { streakAtEarn: streakResult.newStreak },
        createdAt: now,
      });
    }

    if (streakResult.consumeGraceCard) {
      await ctx.db.insert("activityEvents", {
        profileId: me._id,
        kind: "grace_card_consumed",
        payload: { dayKeyOfDrop: dayKey, lastDropDayKey: lastDropDayKey ?? null },
        createdAt: now,
      });
    }

    return dropId;
  },
});

/**
 * The reciprocity-locked home feed (VISION §5.1).
 *
 * Returns one of:
 *   - { locked: true, blurredCount }  — caller hasn't dropped today; show blur screen.
 *   - { locked: false, drops }        — caller has dropped (or is in the 24h grace
 *                                        window for new users); render friends' drops.
 *
 * Server-enforced: a hostile client cannot bypass the lock — when locked, this
 * query never returns the actual drop rows, only the count.
 */
export const feedForUser = query({
  args: { dayKey: v.optional(v.string()) },
  returns: v.union(
    v.object({ locked: v.literal(true), blurredCount: v.number() }),
    v.object({ locked: v.literal(false), drops: v.array(enrichedDropShape) }),
  ),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const today = args.dayKey ?? dayKeyForCaller(me);

    const callerDroppedToday = await hasDroppedToday(ctx, me._id, today);
    const locked = shouldLockFeed({
      callerHasDroppedToday: callerDroppedToday,
      callerCreatedAtMs: me.createdAt,
      nowMs: Date.now(),
    });

    if (locked) {
      const blurredCount = await countTodaysFriendDrops(ctx, me._id, today);
      return { locked: true as const, blurredCount };
    }

    const [friendDrops, ownDrops] = await Promise.all([
      fetchFriendDropsToday(ctx, me._id, today),
      ctx.db
        .query("drops")
        .withIndex("by_owner_day", (q) => q.eq("ownerId", me._id).eq("dayKey", today))
        .collect(),
    ]);
    const allDrops = [...friendDrops, ...ownDrops].sort((a, b) => b.createdAt - a.createdAt);

    // Fetch raw drops and habit colors once per unique author.
    const authorIds = [...new Set(allDrops.map((d) => d.ownerId))];
    const rawDropsByAuthor = new Map<string, Awaited<ReturnType<typeof fetchDropsForHeatmap>>>();
    const colorMapsByAuthor = new Map<string, Map<string, string>>();
    await Promise.all(
      authorIds.map(async (authorId) => {
        const profile = await ctx.db.get(authorId);
        if (!profile) return;
        const drops = await fetchDropsForHeatmap(ctx, authorId, profile.timezone);
        rawDropsByAuthor.set(authorId, drops);
        colorMapsByAuthor.set(authorId, await fetchHabitColorMap(ctx, drops));
      }),
    );

    const enriched = await Promise.all(
      allDrops.map(async (drop) => {
        const rawAuthor = await ctx.db.get(drop.ownerId);
        if (!rawAuthor) return null;
        const author = await resolveProfile(ctx, rawAuthor);
        const photoUrl = drop.photoFileId ? await ctx.storage.getUrl(drop.photoFileId) : null;
        const authorDrops = rawDropsByAuthor.get(drop.ownerId) ?? [];
        const colorMap = colorMapsByAuthor.get(drop.ownerId) ?? new Map();
        const authorHeatmap = buildMultiColorHeatmap(authorDrops, colorMap);
        const habit = drop.habitId ? await ctx.db.get(drop.habitId) : null;
        const habitColor = drop.habitId ? resolveHabitColor(drop.habitId, habit?.color) : null;
        return {
          drop,
          author,
          photoUrl,
          authorHeatmap,
          habitColor,
          habitText: habit?.text ?? null,
        };
      }),
    );
    const filtered = enriched.filter((e): e is NonNullable<typeof e> => e !== null);
    return { locked: false as const, drops: filtered };
  },
});

/**
 * Per-day habit breakdown for the last 365 days. Powers the heatmap on the
 * profile screen. Returns only days with at least one drop; the client fills
 * zeros for remaining cells.
 *
 * Each day entry contains the total drop count and an ordered list of unique
 * habits completed that day (sorted by first-drop time, earliest first) with
 * their colors — used to render split colored bands in the heatmap cells.
 *
 * No friendship gating — heatmaps are public-facing data.
 */
export const heatmapForProfile = query({
  args: { profileId: v.id("profiles") },
  returns: v.array(
    v.object({
      dayKey: v.string(),
      total: v.number(),
      habits: v.array(v.object({ habitId: v.id("habits"), color: v.string() })),
    }),
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return [];
    const sinceMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const sinceDayKey = dayKeyInTimezone(sinceMs, profile.timezone);
    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", args.profileId).gte("dayKey", sinceDayKey))
      .collect();

    // Per-day totals and per-day per-habit first drop timestamp
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

    // Fetch colors for all unique habits referenced
    const seenIds = new Set<string>();
    const habitColorMap = new Map<string, string>();
    await Promise.all(
      drops
        .filter((d) => {
          if (!d.habitId || seenIds.has(d.habitId)) return false;
          seenIds.add(d.habitId);
          return true;
        })
        .map(async (drop) => {
          const habit = await ctx.db.get(drop.habitId!);
          if (habit?.color) habitColorMap.set(drop.habitId!, habit.color);
        }),
    );

    return [...totalByDay.keys()].map((dayKey) => {
      const total = totalByDay.get(dayKey)!;
      const dayMap = dayHabitFirstAt.get(dayKey);
      const habits = dayMap
        ? [...dayMap.entries()]
            .sort((a, b) => a[1] - b[1])
            .slice(-3)
            .map(([habitId]) => ({
              habitId: habitId as Id<"habits">,
              color: resolveHabitColor(habitId, habitColorMap.get(habitId)),
            }))
        : [];
      return { dayKey, total, habits };
    });
  },
});

/**
 * Per-day activity for a single habit over the last 365 days. Powers the
 * MiniHeatmap on the habit detail screen.
 */
export const heatmapForHabit = query({
  args: { habitId: v.id("habits") },
  returns: v.array(
    v.object({
      dayKey: v.string(),
      total: v.number(),
      habits: v.array(v.object({ habitId: v.id("habits"), color: v.string() })),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.ownerId !== me._id) return [];
    const sinceMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const sinceDayKey = dayKeyInTimezone(sinceMs, me.timezone);
    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me._id).gte("dayKey", sinceDayKey))
      .collect();
    const countByDay = new Map<string, number>();
    for (const d of drops.filter((d) => d.habitId === args.habitId)) {
      countByDay.set(d.dayKey, (countByDay.get(d.dayKey) ?? 0) + 1);
    }
    const color = resolveHabitColor(args.habitId, habit.color);
    return [...countByDay.entries()].map(([dayKey, total]) => ({
      dayKey,
      total,
      habits: [{ habitId: args.habitId, color }],
    }));
  },
});

/**
 * Most recent drops by a profile, newest first. Used by the profile screen's
 * "recent drops" list. Visibility filter:
 *   - Caller viewing their own profile: all drops, including private.
 *   - Caller viewing a friend's profile (Phase 4): public + friends-tier.
 *   - Caller viewing a stranger: public only.
 *
 * Phase 3 ships only the own-profile case (`profileId === me._id`) — the
 * full friendship-aware filter lands in Phase 4.
 */
export const memoryThumbnails = query({
  args: { profileId: v.id("profiles") },
  returns: v.array(
    v.object({
      dropId: v.id("drops"),
      dayKey: v.string(),
      photoUrl: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireCallerProfile(ctx);
    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", args.profileId))
      .order("desc")
      .collect();
    return await Promise.all(
      drops.map(async (drop) => ({
        dropId: drop._id,
        dayKey: drop.dayKey,
        photoUrl: drop.photoFileId ? await ctx.storage.getUrl(drop.photoFileId) : null,
      })),
    );
  },
});

export const forDay = query({
  args: { profileId: v.id("profiles"), dayKey: v.string() },
  returns: v.array(enrichedDropShape),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const isOwnProfile = me._id === args.profileId;

    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", args.profileId).eq("dayKey", args.dayKey))
      .collect();

    const visible = drops.filter((d) => {
      if (isOwnProfile) return true;
      if (d.visibility === "public") return true;
      return false;
    });

    const profileDoc = await ctx.db.get(args.profileId);
    const profileDrops = profileDoc
      ? await fetchDropsForHeatmap(ctx, args.profileId, profileDoc.timezone)
      : [];
    const profileColorMap = await fetchHabitColorMap(ctx, profileDrops);

    const enriched = await Promise.all(
      visible.map(async (drop) => {
        const rawAuthor = await ctx.db.get(drop.ownerId);
        if (!rawAuthor) return null;
        const author = await resolveProfile(ctx, rawAuthor);
        const photoUrl = drop.photoFileId ? await ctx.storage.getUrl(drop.photoFileId) : null;
        const authorHeatmap = buildMultiColorHeatmap(profileDrops, profileColorMap);
        const habit = drop.habitId ? await ctx.db.get(drop.habitId) : null;
        const habitColor = drop.habitId ? resolveHabitColor(drop.habitId, habit?.color) : null;
        return {
          drop,
          author,
          photoUrl,
          authorHeatmap,
          habitColor,
          habitText: habit?.text ?? null,
        };
      }),
    );
    return enriched.filter((e): e is NonNullable<typeof e> => e !== null);
  },
});

export const forHabit = query({
  args: { habitId: v.id("habits") },
  returns: v.array(enrichedDropShape),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);

    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", me._id))
      .order("desc")
      .collect();

    const habitDrops = drops.filter((d) => d.habitId === args.habitId);

    const profileDrops = await fetchDropsForHeatmap(ctx, me._id, me.timezone);
    const profileColorMap = await fetchHabitColorMap(ctx, profileDrops);

    const enriched = await Promise.all(
      habitDrops.map(async (drop) => {
        const rawAuthor = await ctx.db.get(drop.ownerId);
        if (!rawAuthor) return null;
        const author = await resolveProfile(ctx, rawAuthor);
        const photoUrl = drop.photoFileId ? await ctx.storage.getUrl(drop.photoFileId) : null;
        const authorHeatmap = buildMultiColorHeatmap(profileDrops, profileColorMap);
        const habit = drop.habitId ? await ctx.db.get(drop.habitId) : null;
        const habitColor = drop.habitId ? resolveHabitColor(drop.habitId, habit?.color) : null;
        return {
          drop,
          author,
          photoUrl,
          authorHeatmap,
          habitColor,
          habitText: habit?.text ?? null,
        };
      }),
    );
    return enriched.filter((e): e is NonNullable<typeof e> => e !== null);
  },
});

export const recentForProfile = query({
  args: { profileId: v.id("profiles"), limit: v.optional(v.number()) },
  returns: v.array(enrichedDropShape),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const isOwnProfile = me._id === args.profileId;
    const limit = args.limit ?? 20;

    // Cross-profile callers see friends-tier drops only when an accepted
    // friendship row exists between caller and owner.
    let isFriend = false;
    if (!isOwnProfile) {
      const { low, high } = canonicalPair(me._id, args.profileId);
      const f = await ctx.db
        .query("friendships")
        .withIndex("by_pair", (q) => q.eq("pairLow", low).eq("pairHigh", high))
        .unique();
      isFriend = f?.status === "accepted";
    }

    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", args.profileId))
      .order("desc")
      .take(limit);

    const visible = drops.filter((d) => {
      if (isOwnProfile) return true;
      if (d.visibility === "public") return true;
      if (d.visibility === "friends" && isFriend) return true;
      return false;
    });

    const profileDoc = await ctx.db.get(args.profileId);
    const profileDrops = profileDoc
      ? await fetchDropsForHeatmap(ctx, args.profileId, profileDoc.timezone)
      : [];
    const profileColorMap = await fetchHabitColorMap(ctx, profileDrops);

    const enriched = await Promise.all(
      visible.map(async (drop) => {
        const rawAuthor = await ctx.db.get(drop.ownerId);
        if (!rawAuthor) return null;
        const author = await resolveProfile(ctx, rawAuthor);
        const photoUrl = drop.photoFileId ? await ctx.storage.getUrl(drop.photoFileId) : null;
        const authorHeatmap = buildMultiColorHeatmap(profileDrops, profileColorMap);
        const habit = drop.habitId ? await ctx.db.get(drop.habitId) : null;
        const habitColor = drop.habitId ? resolveHabitColor(drop.habitId, habit?.color) : null;
        return {
          drop,
          author,
          photoUrl,
          authorHeatmap,
          habitColor,
          habitText: habit?.text ?? null,
        };
      }),
    );
    return enriched.filter((e): e is NonNullable<typeof e> => e !== null);
  },
});
