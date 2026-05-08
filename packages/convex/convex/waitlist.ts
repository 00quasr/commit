import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

const utmValidator = v.object({
  source: v.optional(v.string()),
  medium: v.optional(v.string()),
  campaign: v.optional(v.string()),
});

export const add = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
    utm: v.optional(utmValidator),
    userAgent: v.optional(v.string()),
    // Hidden field. If a bot fills it, we silently 200 without storing.
    honeypot: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ status: v.literal("ok") }),
    v.object({ status: v.literal("duplicate") }),
    v.object({ status: v.literal("invalid") }),
  ),
  handler: async (ctx, args) => {
    if (args.honeypot && args.honeypot.length > 0) {
      return { status: "ok" } as const;
    }
    const email = args.email.trim();
    if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_REGEX.test(email)) {
      return { status: "invalid" } as const;
    }
    const emailLower = email.toLowerCase();
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email_lower", (q) => q.eq("emailLower", emailLower))
      .unique();
    if (existing) {
      return { status: "duplicate" } as const;
    }
    await ctx.db.insert("waitlist", {
      email,
      emailLower,
      createdAt: Date.now(),
      ...(args.source !== undefined && { source: args.source }),
      ...(args.utm !== undefined && { utm: args.utm }),
      ...(args.userAgent !== undefined && { userAgent: args.userAgent }),
    });
    return { status: "ok" } as const;
  },
});

export const count = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const rows = await ctx.db.query("waitlist").collect();
    return rows.length;
  },
});
