import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireCallerProfile } from "./_helpers";

const profileShape = v.object({
  _id: v.id("profiles"),
  _creationTime: v.number(),
  clerkUserId: v.string(),
  username: v.string(),
  usernameLower: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  timezone: v.string(),
  createdAt: v.number(),
});

const habitSnippet = v.object({
  habitId: v.id("habits"),
  text: v.string(),
  color: v.union(v.string(), v.null()),
  cycleDays: v.optional(v.number()),
});

const eventShape = v.object({
  _id: v.id("activityEvents"),
  _creationTime: v.number(),
  kind: v.union(v.literal("habit_created"), v.literal("streak_milestone")),
  createdAt: v.number(),
  author: profileShape,
  habit: v.union(habitSnippet, v.null()),
  streak: v.union(v.number(), v.null()),
});

const FEED_LIMIT = 50;
const PER_PROFILE_LIMIT = 20;

/**
 * Feed of social events from accepted friends + caller. Returns the N most
 * recent habit_created and streak_milestone events, newest first. Friend
 * graph is bounded (~30 in V2 per friendships.ts) so the per-profile fan-out
 * stays cheap.
 *
 * Events whose owning habit has been deleted or has shareEvents === false
 * are filtered out. Drop-derived events fall back to no habit metadata when
 * the habit has been archived since.
 */
export const feedForUser = query({
  args: {},
  returns: v.array(eventShape),
  handler: async (ctx) => {
    const me = await requireCallerProfile(ctx);

    // Resolve accepted-friend profile IDs (mirroring friendships.listForUser).
    const [lowMatches, highMatches] = await Promise.all([
      ctx.db
        .query("friendships")
        .withIndex("by_low", (q) => q.eq("pairLow", me._id).eq("status", "accepted"))
        .collect(),
      ctx.db
        .query("friendships")
        .withIndex("by_high", (q) => q.eq("pairHigh", me._id).eq("status", "accepted"))
        .collect(),
    ]);
    const friendIds = [...lowMatches.map((f) => f.pairHigh), ...highMatches.map((f) => f.pairLow)];
    const profileIds = [me._id, ...friendIds];

    const eventsByProfile = await Promise.all(
      profileIds.map(async (profileId) => {
        const events = await ctx.db
          .query("activityEvents")
          .withIndex("by_profile_created", (q) => q.eq("profileId", profileId))
          .order("desc")
          .take(PER_PROFILE_LIMIT);
        return events.filter((e) => e.kind === "habit_created" || e.kind === "streak_milestone");
      }),
    );

    const merged = eventsByProfile
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, FEED_LIMIT);

    // Cache profiles + habits we touch to keep enrichment to one read each.
    const profileCache = new Map<Id<"profiles">, Doc<"profiles">>();
    const habitCache = new Map<Id<"habits">, Doc<"habits"> | null>();

    const getProfile = async (id: Id<"profiles">) => {
      const cached = profileCache.get(id);
      if (cached) return cached;
      const p = await ctx.db.get(id);
      if (p) profileCache.set(id, p);
      return p;
    };
    const getHabit = async (id: Id<"habits">) => {
      if (habitCache.has(id)) return habitCache.get(id) ?? null;
      const h = await ctx.db.get(id);
      habitCache.set(id, h);
      return h;
    };

    const enriched = await Promise.all(
      merged.map(async (event) => {
        const author = await getProfile(event.profileId);
        if (!author) return null;

        let habit: Doc<"habits"> | null = null;
        const habitIdFromPayload =
          event.payload && typeof event.payload === "object" && "habitId" in event.payload
            ? (event.payload.habitId as Id<"habits">)
            : null;
        if (habitIdFromPayload) {
          habit = await getHabit(habitIdFromPayload);
        }

        // Suppress events for habits the owner has muted, or that have been
        // deleted entirely (the create-event references a missing row).
        if (event.kind === "habit_created") {
          if (!habit) return null;
          if (habit.shareEvents === false) return null;
        }

        const streak =
          event.kind === "streak_milestone" &&
          event.payload &&
          typeof event.payload === "object" &&
          "streak" in event.payload &&
          typeof event.payload.streak === "number"
            ? (event.payload.streak as number)
            : null;

        return {
          _id: event._id,
          _creationTime: event._creationTime,
          kind: event.kind as "habit_created" | "streak_milestone",
          createdAt: event.createdAt,
          author,
          habit: habit
            ? {
                habitId: habit._id,
                text: habit.text,
                color: habit.color ?? null,
                cycleDays: habit.cycleDays,
              }
            : null,
          streak,
        };
      }),
    );

    return enriched.filter((e): e is NonNullable<typeof e> => e !== null);
  },
});
