import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const difficulty = v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"));

const visibility = v.union(v.literal("public"), v.literal("friends"), v.literal("private"));

const reactionEmoji = v.union(v.literal("🔥"), v.literal("💪"), v.literal("👀"), v.literal("💯"));

const friendshipStatus = v.union(v.literal("pending"), v.literal("accepted"));

const activityKind = v.union(
  v.literal("drop_created"),
  v.literal("xp_gained"),
  v.literal("level_up"),
  v.literal("streak_milestone"),
  v.literal("grace_card_earned"),
  v.literal("grace_card_consumed"),
  v.literal("friendship_accepted"),
);

export default defineSchema({
  profiles: defineTable({
    clerkUserId: v.string(),
    username: v.string(),
    // Optional in schema so existing pre-pivot rows still validate. Always written
    // by `profiles.upsert`, so new + re-signed-in rows have it populated.
    usernameLower: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
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
    difficulty,
    cycleDays: v.number(), // 1 = daily, 2 = every 2 days, ... 31 = monthly
    // dayKey at habit creation in the owner's timezone. Stored explicitly so
    // dueToday queries don't depend on _creationTime (which can drift from
    // vi.useFakeTimers in tests, and whose timezone interpretation could
    // change if the owner moves regions).
    createdDayKey: v.string(),
    // Denormalized "last drop day" for fast dueToday queries — updated by
    // drops.create when a drop is linked to this habit.
    lastDropDayKey: v.optional(v.string()),
    archived: v.boolean(),
  }).index("by_owner_archived", ["ownerId", "archived"]),

  drops: defineTable({
    ownerId: v.id("profiles"),
    habitId: v.optional(v.id("habits")), // optional: ad-hoc drops without a habit are allowed
    caption: v.string(),
    tags: v.array(v.string()),
    difficulty,
    xpAwarded: v.number(),
    photoFileId: v.optional(v.id("_storage")),
    voiceFileId: v.optional(v.id("_storage")),
    dayKey: v.string(),
    createdAt: v.number(),
    visibility,
    reactionCount: v.number(),
    viewCount: v.number(),
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
    .index("by_drop_reactor", ["dropId", "reactorId"]),

  views: defineTable({
    dropId: v.id("drops"),
    viewerId: v.id("profiles"),
    viewedAt: v.number(),
  })
    .index("by_drop", ["dropId"])
    .index("by_drop_viewer", ["dropId", "viewerId"]),

  userStats: defineTable({
    profileId: v.id("profiles"),
    totalXp: v.number(),
    level: v.number(),
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
  }).index("by_profile_created", ["profileId", "createdAt"]),

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
