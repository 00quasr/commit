import { isDueToday } from "@commit/domain";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { dayKeyForCaller, requireCallerProfile } from "./_helpers";

const MAX_TEXT = 280;
const MIN_CYCLE = 1;
const MAX_CYCLE = 31;
const MAX_HABITS = 3;

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

const habitShape = v.object({
  _id: v.id("habits"),
  _creationTime: v.number(),
  ownerId: v.id("profiles"),
  text: v.string(),
  cycleDays: v.number(),
  createdDayKey: v.string(),
  lastDropDayKey: v.optional(v.string()),
  archived: v.boolean(),
  color: v.optional(v.string()),
  scheduledDeleteAt: v.optional(v.number()),
});

export const create = mutation({
  args: {
    text: v.string(),
    cycleDays: v.number(),
    color: v.string(),
  },
  returns: v.id("habits"),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const text = args.text.trim();
    if (text.length === 0) {
      throw new Error("text cannot be empty");
    }
    if (text.length > MAX_TEXT) {
      throw new Error(`text exceeds ${MAX_TEXT} chars`);
    }
    if (
      !Number.isInteger(args.cycleDays) ||
      args.cycleDays < MIN_CYCLE ||
      args.cycleDays > MAX_CYCLE
    ) {
      throw new Error(`cycleDays must be an integer in [${MIN_CYCLE}, ${MAX_CYCLE}]`);
    }

    const existing = await ctx.db
      .query("habits")
      .withIndex("by_owner_archived", (q) => q.eq("ownerId", me._id).eq("archived", false))
      .collect();
    if (existing.length >= MAX_HABITS) {
      throw new Error(`habit limit of ${MAX_HABITS} reached`);
    }

    const habitId = await ctx.db.insert("habits", {
      ownerId: me._id,
      text,
      cycleDays: args.cycleDays,
      createdDayKey: dayKeyForCaller(me),
      archived: false,
      color: args.color,
    });

    // Social commitment effect (COM-23): friends see the user start a habit.
    // Suppressed when shareEvents is explicitly false; absent === enabled.
    await ctx.db.insert("activityEvents", {
      profileId: me._id,
      kind: "habit_created",
      payload: { habitId, text, cycleDays: args.cycleDays, color: args.color },
      createdAt: Date.now(),
    });

    return habitId;
  },
});

// User-facing per-habit opt-out for friend-feed events. Reads default to true
// (absent === enabled). Writes only when the value differs to keep the patch
// small.
export const setShareEvents = mutation({
  args: { habitId: v.id("habits"), share: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");
    if (habit.ownerId !== me._id) throw new Error("Not your habit");
    await ctx.db.patch(args.habitId, { shareEvents: args.share });
    return null;
  },
});

export const archive = mutation({
  args: { habitId: v.id("habits") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");
    if (habit.ownerId !== me._id) throw new Error("Not your habit");
    if (habit.archived) return null;
    await ctx.db.patch(args.habitId, { archived: true });
    return null;
  },
});

export const unarchive = mutation({
  args: { habitId: v.id("habits") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");
    if (habit.ownerId !== me._id) throw new Error("Not your habit");
    if (!habit.archived) return null;
    await ctx.db.patch(args.habitId, { archived: false });
    return null;
  },
});

export const scheduleDelete = mutation({
  args: { habitId: v.id("habits") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");
    if (habit.ownerId !== me._id) throw new Error("Not your habit");
    if (!habit.archived) throw new Error("Only archived habits can be scheduled for deletion");
    await ctx.db.patch(args.habitId, { scheduledDeleteAt: Date.now() + GRACE_PERIOD_MS });
    return null;
  },
});

export const cancelScheduledDelete = mutation({
  args: { habitId: v.id("habits") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");
    if (habit.ownerId !== me._id) throw new Error("Not your habit");
    await ctx.db.patch(args.habitId, { scheduledDeleteAt: undefined });
    return null;
  },
});

export const purgeExpired = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const candidates = await ctx.db.query("habits").collect();
    for (const habit of candidates) {
      if (habit.scheduledDeleteAt !== undefined && habit.scheduledDeleteAt <= now) {
        const drops = await ctx.db
          .query("drops")
          .withIndex("by_owner_day", (q) => q.eq("ownerId", habit.ownerId))
          .collect();
        for (const drop of drops) {
          if (drop.habitId === habit._id) {
            if (drop.photoFileId) await ctx.storage.delete(drop.photoFileId);
            if (drop.voiceFileId) await ctx.storage.delete(drop.voiceFileId);
            await ctx.db.delete(drop._id);
          }
        }
        await ctx.db.delete(habit._id);
      }
    }
    return null;
  },
});

/**
 * All non-archived habits for the caller. Used by the Today screen to render
 * both due and not-yet-due habits, and by edit/settings UI.
 */
export const list = query({
  args: {},
  returns: v.array(habitShape),
  handler: async (ctx) => {
    const me = await requireCallerProfile(ctx);
    return await ctx.db
      .query("habits")
      .withIndex("by_owner_archived", (q) => q.eq("ownerId", me._id).eq("archived", false))
      .order("desc")
      .collect();
  },
});

export const listArchived = query({
  args: {},
  returns: v.array(v.object({ ...habitShape.fields, dropCount: v.number() })),
  handler: async (ctx) => {
    const me = await requireCallerProfile(ctx);
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_owner_archived", (q) => q.eq("ownerId", me._id).eq("archived", true))
      .order("desc")
      .collect();

    const allDrops = await ctx.db
      .query("drops")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", me._id))
      .collect();

    const countByHabit = new Map<string, number>();
    for (const drop of allDrops) {
      if (drop.habitId) {
        countByHabit.set(drop.habitId, (countByHabit.get(drop.habitId) ?? 0) + 1);
      }
    }

    return habits.map((h) => ({ ...h, dropCount: countByHabit.get(h._id) ?? 0 }));
  },
});

/**
 * Habits that are due today for the caller, computed via @commit/domain.isDueToday
 * using each habit's stored `createdDayKey`, `lastDropDayKey`, and `cycleDays`
 * against today's dayKey in the caller's timezone.
 */
export const dueToday = query({
  args: {},
  returns: v.array(habitShape),
  handler: async (ctx) => {
    const me = await requireCallerProfile(ctx);
    const today = dayKeyForCaller(me);
    const active = await ctx.db
      .query("habits")
      .withIndex("by_owner_archived", (q) => q.eq("ownerId", me._id).eq("archived", false))
      .collect();

    return active.filter((habit) =>
      isDueToday({
        cycleDays: habit.cycleDays,
        habitCreatedDayKey: habit.createdDayKey,
        lastDropDayKey: habit.lastDropDayKey,
        todayDayKey: today,
      }),
    );
  },
});
