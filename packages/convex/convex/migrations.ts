import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const removeDifficulty = internalMutation({
  args: {},
  returns: v.object({ habits: v.number(), drops: v.number() }),
  handler: async (ctx) => {
    const habits = await ctx.db.query("habits").collect();
    for (const doc of habits) {
      const { difficulty: _d, ...rest } = doc as typeof doc & { difficulty?: unknown };
      await ctx.db.replace(doc._id, rest as typeof doc);
    }
    const drops = await ctx.db.query("drops").collect();
    for (const doc of drops) {
      const { difficulty: _d, ...rest } = doc as typeof doc & { difficulty?: unknown };
      await ctx.db.replace(doc._id, rest as typeof doc);
    }
    return { habits: habits.length, drops: drops.length };
  },
});
