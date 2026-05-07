import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireCallerProfile } from "./_helpers";

/**
 * Mark a drop as viewed by the caller. Idempotent — the by_drop_viewer index
 * dedups so each (drop, viewer) pair has exactly one view row.
 *
 * Increments drops.viewCount only on first view per viewer.
 */
export const markSeen = mutation({
  args: { dropId: v.id("drops") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const drop = await ctx.db.get(args.dropId);
    if (!drop) {
      throw new Error("Drop not found");
    }

    const existing = await ctx.db
      .query("views")
      .withIndex("by_drop_viewer", (q) => q.eq("dropId", args.dropId).eq("viewerId", me._id))
      .unique();

    if (existing) {
      return null;
    }

    await ctx.db.insert("views", {
      dropId: args.dropId,
      viewerId: me._id,
      viewedAt: Date.now(),
    });
    await ctx.db.patch(args.dropId, { viewCount: drop.viewCount + 1 });
    return null;
  },
});
