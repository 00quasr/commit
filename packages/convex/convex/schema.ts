import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const difficulty = v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"));

const visibility = v.union(v.literal("circle"), v.literal("just_me"));

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
    avatarUrl: v.optional(v.string()),
    timezone: v.string(),
    createdAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  todos: defineTable({
    ownerId: v.id("profiles"),
    text: v.string(),
    difficulty,
    dayKey: v.string(),
    completedAt: v.optional(v.number()),
    dropId: v.optional(v.id("drops")),
  })
    .index("by_owner_day", ["ownerId", "dayKey"])
    .index("by_owner_completed", ["ownerId", "completedAt"]),

  drops: defineTable({
    ownerId: v.id("profiles"),
    todoId: v.optional(v.id("todos")),
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
});
