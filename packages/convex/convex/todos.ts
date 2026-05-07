import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { dayKeyForCaller, requireCallerProfile } from "./_helpers";

const MAX_TEXT = 280;

const todoShape = v.object({
  _id: v.id("todos"),
  _creationTime: v.number(),
  ownerId: v.id("profiles"),
  text: v.string(),
  difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  dayKey: v.string(),
  completedAt: v.optional(v.number()),
  dropId: v.optional(v.id("drops")),
});

export const create = mutation({
  args: {
    text: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  returns: v.id("todos"),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const text = args.text.trim();
    if (text.length === 0) {
      throw new Error("text cannot be empty");
    }
    if (text.length > MAX_TEXT) {
      throw new Error(`text exceeds ${MAX_TEXT} chars`);
    }

    return await ctx.db.insert("todos", {
      ownerId: me._id,
      text,
      difficulty: args.difficulty,
      dayKey: dayKeyForCaller(me),
    });
  },
});

export const complete = mutation({
  args: { todoId: v.id("todos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const todo = await ctx.db.get(args.todoId);
    if (!todo) {
      throw new Error("Todo not found");
    }
    if (todo.ownerId !== me._id) {
      throw new Error("Not your todo");
    }
    if (todo.completedAt !== undefined) {
      // Idempotent — already complete.
      return null;
    }
    await ctx.db.patch(args.todoId, { completedAt: Date.now() });
    return null;
  },
});

/**
 * Returns today's todos for the caller, newest first. Open and completed
 * todos are mixed in the result; the UI groups them as needed.
 */
export const todayForUser = query({
  args: {},
  returns: v.array(todoShape),
  handler: async (ctx) => {
    const me = await requireCallerProfile(ctx);
    const today = dayKeyForCaller(me);
    return await ctx.db
      .query("todos")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", me._id).eq("dayKey", today))
      .order("desc")
      .collect();
  },
});
