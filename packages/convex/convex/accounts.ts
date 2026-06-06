import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation } from "./_generated/server";

/**
 * GDPR / Apple Guideline 5.1.1(v) delete-account flow.
 *
 * The public `deleteMyAccount` action orchestrates:
 *   1. internal mutation `purgeMyData` — removes every row owned by the
 *      caller and collects storage file IDs to delete.
 *   2. `ctx.storage.delete` for each photo/voice file.
 *   3. Clerk admin API `DELETE /v1/users/{id}` — removes the auth identity.
 *
 * Ordering: Convex data → storage files → Clerk. If the Clerk delete fails
 * after Convex is purged, the user can sign back in and re-run the flow
 * (their Convex row will be re-created empty by `profiles.upsert`, then
 * purged again on retry).
 */

/**
 * Deletes every row that references the caller's profile, plus the profile
 * itself. Returns the storage file IDs from drops so the calling action can
 * delete the binaries from `_storage`.
 *
 * Counter integrity: reactions/views authored by the leaving user on OTHER
 * users' drops are deleted with a paired decrement of
 * `drops.reactionCount` / `drops.viewCount` so the denormalized counters
 * stay accurate.
 */
export const purgeMyData = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.array(v.id("_storage")),
  handler: async (ctx, { clerkUserId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!profile) return [];

    const profileId = profile._id;
    const storageIds: Id<"_storage">[] = [];

    // 1. Drops owned by the user — collect storage refs, drop reactions/views
    //    on each (which are other users' interactions), then delete the drop.
    const drops = await ctx.db
      .query("drops")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", profileId))
      .collect();
    for (const drop of drops) {
      if (drop.photoFileId) storageIds.push(drop.photoFileId);
      if (drop.voiceFileId) storageIds.push(drop.voiceFileId);

      const reactionsOnDrop = await ctx.db
        .query("reactions")
        .withIndex("by_drop", (q) => q.eq("dropId", drop._id))
        .collect();
      for (const r of reactionsOnDrop) await ctx.db.delete(r._id);

      const viewsOnDrop = await ctx.db
        .query("views")
        .withIndex("by_drop", (q) => q.eq("dropId", drop._id))
        .collect();
      for (const v of viewsOnDrop) await ctx.db.delete(v._id);

      await ctx.db.delete(drop._id);
    }

    // 2. Habits (active + archived).
    const habitsActive = await ctx.db
      .query("habits")
      .withIndex("by_owner_archived", (q) => q.eq("ownerId", profileId).eq("archived", false))
      .collect();
    const habitsArchived = await ctx.db
      .query("habits")
      .withIndex("by_owner_archived", (q) => q.eq("ownerId", profileId).eq("archived", true))
      .collect();
    for (const h of habitsActive) await ctx.db.delete(h._id);
    for (const h of habitsArchived) await ctx.db.delete(h._id);

    // 3. Friendships — delete rows where the user is on either side of the
    //    canonical pair.
    const friendshipsLow = await ctx.db
      .query("friendships")
      .withIndex("by_low", (q) => q.eq("pairLow", profileId))
      .collect();
    const friendshipsHigh = await ctx.db
      .query("friendships")
      .withIndex("by_high", (q) => q.eq("pairHigh", profileId))
      .collect();
    for (const f of friendshipsLow) await ctx.db.delete(f._id);
    for (const f of friendshipsHigh) await ctx.db.delete(f._id);

    // 4. Reactions authored by the user on OTHER users' drops — delete and
    //    decrement the affected drop's reactionCount.
    const myReactions = await ctx.db
      .query("reactions")
      .withIndex("by_reactor", (q) => q.eq("reactorId", profileId))
      .collect();
    for (const r of myReactions) {
      const drop = await ctx.db.get(r.dropId);
      if (drop) {
        await ctx.db.patch(r.dropId, {
          reactionCount: Math.max(0, drop.reactionCount - 1),
        });
      }
      await ctx.db.delete(r._id);
    }

    // 5. Views authored by the user on OTHER users' drops — delete and
    //    decrement viewCount.
    const myViews = await ctx.db
      .query("views")
      .withIndex("by_viewer", (q) => q.eq("viewerId", profileId))
      .collect();
    for (const v of myViews) {
      const drop = await ctx.db.get(v.dropId);
      if (drop) {
        await ctx.db.patch(v.dropId, {
          viewCount: Math.max(0, drop.viewCount - 1),
        });
      }
      await ctx.db.delete(v._id);
    }

    // 6. userStats (1:1 by profile).
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .unique();
    if (stats) await ctx.db.delete(stats._id);

    // 7. activityEvents.
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_profile_created", (q) => q.eq("profileId", profileId))
      .collect();
    for (const e of events) await ctx.db.delete(e._id);

    // 8. The profile itself.
    await ctx.db.delete(profileId);

    return storageIds;
  },
});

/**
 * Public action invoked by the mobile delete-account screen. Purges all
 * Convex data + storage files, then deletes the Clerk user via admin API.
 * The client is responsible for signing out and redirecting on success.
 */
export const deleteMyAccount = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "unauthenticated", message: "Unauthenticated" });
    }
    const clerkUserId = identity.subject;

    const storageIds = await ctx.runMutation(internal.accounts.purgeMyData, {
      clerkUserId,
    });

    for (const id of storageIds) {
      try {
        await ctx.storage.delete(id);
      } catch {
        // Tolerate missing files — likely deleted in a previous attempt.
      }
    }

    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      throw new ConvexError({
        code: "clerk_not_configured",
        message:
          "CLERK_SECRET_KEY not set on Convex. Run `npx convex env set CLERK_SECRET_KEY <key>`.",
      });
    }

    const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${clerkSecret}` },
    });
    // 404 = user already gone; treat as success so the flow is idempotent.
    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      throw new ConvexError({
        code: "clerk_delete_failed",
        message: `Clerk delete failed (${res.status}): ${body.slice(0, 200)}`,
      });
    }

    return null;
  },
});
