import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireCallerProfile } from "./_helpers";

const emojiValidator = v.union(v.literal("🔥"), v.literal("💪"), v.literal("👀"), v.literal("💯"));

/**
 * Toggle a reaction on a drop. Dedup is enforced via the by_drop_reactor index:
 * each (drop, reactor) pair has at most one reaction row.
 *
 * - No existing row: insert + increment drops.reactionCount → "added"
 * - Existing row, same emoji: delete + decrement drops.reactionCount → "removed"
 * - Existing row, different emoji: patch emoji (no count change) → "updated"
 */
export const toggle = mutation({
  args: {
    dropId: v.id("drops"),
    emoji: emojiValidator,
  },
  returns: v.union(v.literal("added"), v.literal("updated"), v.literal("removed")),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const drop = await ctx.db.get(args.dropId);
    if (!drop) {
      throw new Error("Drop not found");
    }

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_drop_reactor", (q) => q.eq("dropId", args.dropId).eq("reactorId", me._id))
      .unique();

    if (!existing) {
      await ctx.db.insert("reactions", {
        dropId: args.dropId,
        reactorId: me._id,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.dropId, { reactionCount: drop.reactionCount + 1 });
      return "added";
    }

    if (existing.emoji === args.emoji) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.dropId, {
        reactionCount: Math.max(0, drop.reactionCount - 1),
      });
      return "removed";
    }

    await ctx.db.patch(existing._id, { emoji: args.emoji });
    return "updated";
  },
});
