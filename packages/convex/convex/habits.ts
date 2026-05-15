import { isDueToday } from "@commit/domain";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { dayKeyForCaller, requireCallerProfile } from "./_helpers";

const MAX_TEXT = 280;
const MIN_CYCLE = 1;
const MAX_CYCLE = 31;

const habitShape = v.object({
  _id: v.id("habits"),
  _creationTime: v.number(),
  ownerId: v.id("profiles"),
  text: v.string(),
  difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  cycleDays: v.number(),
  createdDayKey: v.string(),
  lastDropDayKey: v.optional(v.string()),
  archived: v.boolean(),
  color: v.optional(v.string()),
});

export const create = mutation({
  args: {
    text: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
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

    return await ctx.db.insert("habits", {
      ownerId: me._id,
      text,
      difficulty: args.difficulty,
      cycleDays: args.cycleDays,
      createdDayKey: dayKeyForCaller(me),
      archived: false,
      color: args.color,
    });
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
