import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    clerkUserId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    timezone: v.string(),
    createdAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),
});
