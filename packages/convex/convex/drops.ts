import {
  calculateXP,
  dayKeyInTimezone,
  levelFromXP,
  shouldLockFeed,
  streakAfterDrop,
} from "@commit/domain";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  countTodaysFriendDrops,
  dayKeyForCaller,
  fetchFriendDropsToday,
  fetchHeatmapForProfile,
  hasDroppedToday,
  requireCallerProfile,
} from "./_helpers";

/**
 * Returns a one-time signed URL the client can POST a file to, getting back
 * a `{ storageId }` payload. The storageId becomes `photoFileId` (or
 * `voiceFileId`) on the subsequent `drops.create` call.
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
  tags: v.array(v.string()),
  difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  xpAwarded: v.number(),
  photoFileId: v.optional(v.id("_storage")),
  voiceFileId: v.optional(v.id("_storage")),
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

const heatmapEntryShape = v.object({ dayKey: v.string(), count: v.number() });

const enrichedDropShape = v.object({
  drop: dropShape,
  author: profileShape,
  // Resolved Convex storage URLs. Server-side resolution avoids N+1 round-trips
  // from the mobile client; URLs are signed and expire (Convex default ~1h).
  photoUrl: v.union(v.string(), v.null()),
  voiceUrl: v.union(v.string(), v.null()),
  // Year-long drop heatmap for the author — powers the MiniHeatmap in DropCard.
  authorHeatmap: v.array(heatmapEntryShape),
});

const MAX_CAPTION = 100;
const MAX_TAGS = 5;
const STREAK_MILESTONES = new Set([7, 14, 30, 60, 100]);

function normalizeTags(input: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of input) {
    const t = raw.trim().toLowerCase();
    if (t.length > 0) {
      seen.add(t);
    }
  }
  return [...seen];
}

export const create = mutation({
  args: {
    habitId: v.optional(v.id("habits")),
    caption: v.string(),
    tags: v.array(v.string()),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    visibility: v.union(v.literal("public"), v.literal("friends"), v.literal("private")),
    photoFileId: v.optional(v.id("_storage")),
    voiceFileId: v.optional(v.id("_storage")),
  },
  returns: v.id("drops"),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);

    // Validate caption.
    if (args.caption.length > MAX_CAPTION) {
      throw new Error(`caption exceeds ${MAX_CAPTION} chars`);
    }

    // Normalize and validate tags.
    const tags = normalizeTags(args.tags);
    if (tags.length > MAX_TAGS) {
      throw new Error(`too many tags (max ${MAX_TAGS})`);
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
    const previousTotalXp = stats?.totalXp ?? 0;
    const previousLevel = stats?.level ?? 0;
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

    const xpAwarded = calculateXP(args.difficulty, streakResult.newStreak);
    const newTotalXp = previousTotalXp + xpAwarded;
    const newLevel = levelFromXP(newTotalXp);
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
      tags,
      difficulty: args.difficulty,
      xpAwarded,
      ...(args.photoFileId !== undefined ? { photoFileId: args.photoFileId } : {}),
      ...(args.voiceFileId !== undefined ? { voiceFileId: args.voiceFileId } : {}),
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
      totalXp: newTotalXp,
      level: newLevel,
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

    // Activity events. Always emit drop_created. Conditionally emit level_up,
    // streak_milestone, grace_card_earned, grace_card_consumed.
    await ctx.db.insert("activityEvents", {
      profileId: me._id,
      kind: "drop_created",
      payload: { dropId, xpAwarded, dayKey, streakAfter: streakResult.newStreak },
      createdAt: now,
    });

    if (newLevel > previousLevel) {
      await ctx.db.insert("activityEvents", {
        profileId: me._id,
        kind: "level_up",
        payload: { fromLevel: previousLevel, toLevel: newLevel, totalXp: newTotalXp },
        createdAt: now,
      });
    }

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

    // Fetch heatmap once per unique author to avoid redundant DB reads.
    const authorIds = [...new Set(allDrops.map((d) => d.ownerId))];
    const heatmapByAuthor = new Map<string, { dayKey: string; count: number }[]>();
    await Promise.all(
      authorIds.map(async (authorId) => {
        const profile = await ctx.db.get(authorId);
        if (!profile) return;
        heatmapByAuthor.set(
          authorId,
          await fetchHeatmapForProfile(ctx, authorId, profile.timezone),
        );
      }),
    );

    const enriched = await Promise.all(
      allDrops.map(async (drop) => {
        const author = await ctx.db.get(drop.ownerId);
        if (!author) return null;
        const photoUrl = drop.photoFileId ? await ctx.storage.getUrl(drop.photoFileId) : null;
        const voiceUrl = drop.voiceFileId ? await ctx.storage.getUrl(drop.voiceFileId) : null;
        const authorHeatmap = heatmapByAuthor.get(drop.ownerId) ?? [];
        return { drop, author, photoUrl, voiceUrl, authorHeatmap };
      }),
    );
    const filtered = enriched.filter((e): e is NonNullable<typeof e> => e !== null);
    return { locked: false as const, drops: filtered };
  },
});

/**
 * Drop counts per dayKey for the last 365 days. Powers the GitHub-contribution-
 * style heatmap on the profile screen. Returns only days with at least one drop;
 * the client fills zeros for the remaining cells.
 *
 * No friendship gating — heatmaps are public-facing data (anyone with the
 * profile URL can see the activity pattern). Per-drop visibility is honored
 * elsewhere; the heatmap shows ALL drops including private (own profile) or
 * just public + friends-tier (Phase 4 for visiting other profiles).
 */
export const heatmapForProfile = query({
  args: { profileId: v.id("profiles") },
  returns: v.array(v.object({ dayKey: v.string(), count: v.number() })),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return [];
    const sinceMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const sinceDayKey = dayKeyInTimezone(sinceMs, profile.timezone);
    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", args.profileId).gte("dayKey", sinceDayKey))
      .collect();
    const counts = new Map<string, number>();
    for (const d of drops) {
      counts.set(d.dayKey, (counts.get(d.dayKey) ?? 0) + 1);
    }
    return [...counts.entries()].map(([dayKey, count]) => ({ dayKey, count }));
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
export const recentForProfile = query({
  args: { profileId: v.id("profiles"), limit: v.optional(v.number()) },
  returns: v.array(enrichedDropShape),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const isOwnProfile = me._id === args.profileId;
    const limit = args.limit ?? 20;

    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", args.profileId))
      .order("desc")
      .take(limit);

    const visible = drops.filter((d) => {
      if (isOwnProfile) return true;
      if (d.visibility === "public") return true;
      // Friends-tier requires friendship lookup — Phase 4.
      return false;
    });

    const profileDoc = await ctx.db.get(args.profileId);
    const authorHeatmap = profileDoc
      ? await fetchHeatmapForProfile(ctx, args.profileId, profileDoc.timezone)
      : [];

    const enriched = await Promise.all(
      visible.map(async (drop) => {
        const author = await ctx.db.get(drop.ownerId);
        if (!author) return null;
        const photoUrl = drop.photoFileId ? await ctx.storage.getUrl(drop.photoFileId) : null;
        const voiceUrl = drop.voiceFileId ? await ctx.storage.getUrl(drop.voiceFileId) : null;
        return { drop, author, photoUrl, voiceUrl, authorHeatmap };
      }),
    );
    return enriched.filter((e): e is NonNullable<typeof e> => e !== null);
  },
});
