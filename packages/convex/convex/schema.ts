import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const visibility = v.union(v.literal("public"), v.literal("friends"), v.literal("private"));

const reactionEmoji = v.union(v.literal("🔥"), v.literal("💪"), v.literal("👀"), v.literal("💯"));

const friendshipStatus = v.union(v.literal("pending"), v.literal("accepted"));

const activityKind = v.union(
  v.literal("drop_created"),
  v.literal("streak_milestone"),
  v.literal("grace_card_earned"),
  v.literal("grace_card_consumed"),
  v.literal("friendship_accepted"),
  v.literal("habit_created"),
);

export default defineSchema({
  profiles: defineTable({
    clerkUserId: v.string(),
    username: v.string(),
    // Optional in schema so existing pre-pivot rows still validate. Always written
    // by `profiles.upsert`, so new + re-signed-in rows have it populated.
    usernameLower: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // When set, avatar is served from Convex storage; takes priority over avatarUrl.
    avatarFileId: v.optional(v.id("_storage")),
    timezone: v.string(),
    createdAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_username_lower", ["usernameLower"]),

  // Habits are recurring commitment definitions, not day-scoped instances.
  // A habit is "due today" iff (today - lastDropDayKey) >= cycleDays calendar
  // days, or it has never been dropped on. See @commit/domain.isDueToday.
  habits: defineTable({
    ownerId: v.id("profiles"),
    text: v.string(),
    cycleDays: v.number(), // 1 = daily, 2 = every 2 days, ... 31 = monthly
    // When set, overrides cycleDays: habit is due only on these weekdays (0=Sun … 6=Sat).
    customDays: v.optional(v.array(v.number())),
    // dayKey at habit creation in the owner's timezone. Stored explicitly so
    // dueToday queries don't depend on _creationTime (which can drift from
    // vi.useFakeTimers in tests, and whose timezone interpretation could
    // change if the owner moves regions).
    createdDayKey: v.string(),
    // Denormalized "last drop day" for fast dueToday queries — updated by
    // drops.create when a drop is linked to this habit.
    lastDropDayKey: v.optional(v.string()),
    archived: v.boolean(),
    // Hex color from the preset habitColors palette. Optional so existing rows
    // without a color remain valid; UI falls back to a default.
    color: v.optional(v.string()),
    // Unix ms timestamp after which this habit and its drops are permanently
    // deleted by the daily cron. Set by habits.scheduleDelete; cleared by
    // habits.cancelScheduledDelete.
    scheduledDeleteAt: v.optional(v.number()),
    // Legacy: an earlier iteration of this branch wrote a per-habit
    // "share with friends" opt-out. The UI + mutation are gone; the field
    // is accepted here so rows already carrying it still validate. Safe
    // to remove once the dev deployment is cleaned of these rows.
    shareEvents: v.optional(v.boolean()),
  }).index("by_owner_archived", ["ownerId", "archived"]),

  drops: defineTable({
    ownerId: v.id("profiles"),
    habitId: v.optional(v.id("habits")), // optional: ad-hoc drops without a habit are allowed
    caption: v.string(),
    photoFileId: v.optional(v.id("_storage")),
    dayKey: v.string(),
    createdAt: v.number(),
    visibility,
    reactionCount: v.number(),
    viewCount: v.number(),
    streakAtDrop: v.optional(v.number()),
    totalDropsAtDrop: v.optional(v.number()),
  })
    .index("by_owner_day", ["ownerId", "dayKey"])
    .index("by_owner_created", ["ownerId", "createdAt"])
    .index("by_day", ["dayKey"]),

  friendships: defineTable({
    pairLow: v.id("profiles"),
    pairHigh: v.id("profiles"),
    requesterId: v.id("profiles"),
    status: friendshipStatus,
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_pair", ["pairLow", "pairHigh"])
    .index("by_low", ["pairLow", "status"])
    .index("by_high", ["pairHigh", "status"]),

  reactions: defineTable({
    dropId: v.id("drops"),
    reactorId: v.id("profiles"),
    emoji: reactionEmoji,
    createdAt: v.number(),
  })
    .index("by_drop", ["dropId"])
    .index("by_drop_reactor", ["dropId", "reactorId"])
    // GDPR delete needs to enumerate every reaction authored by a leaving
    // user so it can decrement reactionCount on each affected drop.
    .index("by_reactor", ["reactorId"]),

  views: defineTable({
    dropId: v.id("drops"),
    viewerId: v.id("profiles"),
    viewedAt: v.number(),
  })
    .index("by_drop", ["dropId"])
    .index("by_drop_viewer", ["dropId", "viewerId"])
    // GDPR delete needs to enumerate every view authored by a leaving user.
    .index("by_viewer", ["viewerId"]),

  userStats: defineTable({
    profileId: v.id("profiles"),
    streak: v.number(),
    longestStreak: v.number(),
    graceCardsAvailable: v.number(),
    lastDropDayKey: v.optional(v.string()),
    totalDrops: v.number(),
    updatedAt: v.number(),
  }).index("by_profile", ["profileId"]),

  activityEvents: defineTable({
    profileId: v.id("profiles"),
    kind: activityKind,
    payload: v.any(),
    createdAt: v.number(),
  })
    .index("by_profile_created", ["profileId", "createdAt"])
    .index("by_profile_kind_created", ["profileId", "kind", "createdAt"]),

  // Public marketing waitlist for the pre-beta site. Unauthenticated writes
  // — see waitlist.add. emailLower powers idempotent dedupe.
  waitlist: defineTable({
    email: v.string(),
    emailLower: v.string(),
    source: v.optional(v.string()),
    utm: v.optional(
      v.object({
        source: v.optional(v.string()),
        medium: v.optional(v.string()),
        campaign: v.optional(v.string()),
      }),
    ),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email_lower", ["emailLower"]),
});
