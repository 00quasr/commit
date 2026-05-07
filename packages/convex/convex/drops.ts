import { calculateXP, levelFromXP, streakAfterDrop } from "@commit/domain";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { dayKeyForCaller, requireCallerProfile } from "./_helpers";

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
    todoId: v.optional(v.id("todos")),
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

    // Verify linked todo if provided.
    if (args.todoId) {
      const todo = await ctx.db.get(args.todoId);
      if (!todo) throw new Error("Todo not found");
      if (todo.ownerId !== me._id) throw new Error("Not your todo");
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
      ...(args.todoId !== undefined ? { todoId: args.todoId } : {}),
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
    });

    // Link the todo back to the drop (so UI can render "completed → dropped").
    if (args.todoId) {
      await ctx.db.patch(args.todoId, { dropId });
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
