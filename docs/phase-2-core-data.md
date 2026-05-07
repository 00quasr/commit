# Phase 2 — Core data & friendships

**Status**: ⏳ Next
**Estimated days**: 8–12
**Depends on**: Phase 1 done (commit `03da8c8`)
**Goal**: Every Phase 2+ data table, mutation, query, and domain rule exists, is type-safe end-to-end, and is unit-testable through the Convex dashboard. **No mobile UI yet** — that lands in Phase 3.

Maps to VISION.md §6.4 (data model) and §8 Phase 2.

---

## Why this phase has its own week

Phase 1 proved the wires. Phase 2 makes the data model **right** before any UI is built on top of it. If we get the schema, indexes, and reciprocity-lock check correct now, Phases 3–6 are mostly UI work. If we get them wrong, every later phase pays interest.

Specifically, we want:

- **Server-side reciprocity-lock**, not client-side. The server must refuse to return today's friend drops to a user who hasn't dropped today. Client logic can be bypassed; server logic cannot.
- **Pure-TS domain logic** (XP, streak, level, day boundary in user timezone) in `packages/domain/`, runnable in Convex's V8 isolate AND in Vitest, with no Convex imports. This is the only way to get fast, deterministic tests for the rules that drive retention.
- **Indexes designed up front**. Convex queries cost money and time when they table-scan. Every read path in Phase 3+ should have an index from day one.

---

## Architecture overview

The data flow stays the same as Phase 1 — authenticated client calls → Convex mutation → schema write → realtime push to subscribed queries. Phase 2 just adds tables, mutations, and queries on top:

```
iPhone (Expo Go)
  │  signed-in via Clerk → JWT (template "convex")
  ▼
Convex deployment (original-puffin-311.eu-west-1)
  │  ctx.auth.getUserIdentity().subject = clerkUserId
  ├─ profiles      (Phase 1)
  ├─ todos         (Phase 2 ✨)
  ├─ drops         (Phase 2 ✨)
  ├─ friendships   (Phase 2 ✨)
  ├─ reactions     (Phase 2 ✨)
  ├─ views         (Phase 2 ✨)
  ├─ userStats     (Phase 2 ✨)
  └─ activityEvents(Phase 2 ✨)
```

Pure-TS rules (`packages/domain/`) are imported by both:

- Convex mutations (server-side, runs in V8 isolate)
- Vitest tests (Node, runs in CI)

Mobile UI does NOT import `@commit/domain` directly in Phase 2 — it consumes denormalized fields like `userStats.streak` and `userStats.totalXp` via queries instead. That keeps client bundles small and stops drift between client-computed and server-computed values.

---

## Schema additions

Extends `packages/convex/convex/schema.ts`. Existing `profiles` table is unchanged.

### `todos`

Private daily commitments owned by one user. Used to drive the drop flow in Phase 3 (todo done → camera prompt).

```ts
todos: defineTable({
  ownerId: v.id("profiles"),
  text: v.string(), // up to 280 chars enforced in mutation
  difficulty: v.union(
    // VISION §5.4 XP weights
    v.literal("easy"), //   30 XP
    v.literal("medium"), //   60 XP
    v.literal("hard"), //  120 XP
  ),
  dayKey: v.string(), // "YYYY-MM-DD" in owner's timezone at creation time
  completedAt: v.optional(v.number()), // unix ms when marked done; undefined while open
  dropId: v.optional(v.id("drops")), // set when a drop is created from this todo
})
  .index("by_owner_day", ["ownerId", "dayKey"]) // "today's todos for me"
  .index("by_owner_completed", ["ownerId", "completedAt"]); // for stats
```

**Why `dayKey` as a string**: comparing string equality across timezones is much simpler than comparing timestamp ranges, and it lets us reuse the same key on `drops` for the reciprocity-lock check.

### `drops`

The public proof posts. The product's center of gravity.

```ts
drops: defineTable({
  ownerId: v.id("profiles"),
  todoId: v.optional(v.id("todos")), // optional: ad-hoc drops (no todo) allowed
  caption: v.string(), // up to 100 chars enforced
  tags: v.array(v.string()), // ["@build", "@health", custom...] — normalized lowercase
  difficulty: v.union(
    // copied from todo (or chosen if ad-hoc)
    v.literal("easy"),
    v.literal("medium"),
    v.literal("hard"),
  ),
  xpAwarded: v.number(), // computed via packages/domain at insert time, frozen
  // Media — fileIds from Convex File Storage. Phase 3 wires camera + audio.
  // Optional in schema so Phase 2 can insert text-only drops via dashboard for testing.
  photoFileId: v.optional(v.id("_storage")),
  voiceFileId: v.optional(v.id("_storage")),
  // Timezone-stable day key, used by the reciprocity-lock query.
  dayKey: v.string(), // "YYYY-MM-DD" in owner's timezone at drop time
  createdAt: v.number(), // unix ms
  // Privacy. Phase 1 ships only "circle" and "just_me"; "public" deferred to V2.
  visibility: v.union(v.literal("circle"), v.literal("just_me")),
  // Aggregates kept on the row to avoid extra queries on each feed render.
  reactionCount: v.number(), // updated by reactions mutations atomically
  viewCount: v.number(), // updated by views mutations atomically
})
  .index("by_owner_day", ["ownerId", "dayKey"]) // "did this user drop today?" — the lock query
  .index("by_owner_created", ["ownerId", "createdAt"]) // profile timeline
  .index("by_day", ["dayKey"]); // (rare; for admin / metrics only)
```

**Why frozen `xpAwarded`**: changing the XP formula shouldn't retroactively change history. The value computed by the domain function at drop time is the value of record.

### `friendships`

Bidirectional, with status. **Single canonical row per pair** (not two rows) to keep "are A and B friends?" a single index lookup.

```ts
friendships: defineTable({
  // Sorted: pairLow < pairHigh (lex order on Id strings) so each pair has one row.
  pairLow: v.id("profiles"),
  pairHigh: v.id("profiles"),
  requesterId: v.id("profiles"), // who sent the request (one of pairLow/pairHigh)
  status: v.union(v.literal("pending"), v.literal("accepted")),
  createdAt: v.number(),
  acceptedAt: v.optional(v.number()),
})
  .index("by_pair", ["pairLow", "pairHigh"]) // "are A and B friends?"
  .index("by_low", ["pairLow", "status"])
  .index("by_high", ["pairHigh", "status"]); // "list all of B's friends/requests"
```

**Why single canonical row**: if A and B are friends, querying "is X friends with Y?" needs O(1), not O(degree). Two-row schemas force you to either query both directions or denormalize. Canonical pair is simpler. Cost: every read/write needs a sort step (`a < b ? [a, b] : [b, a]`) — encapsulated in a helper in `packages/domain` so it can't be wrong.

### `reactions`

V1 emoji set (🔥 💪 👀 💯). Selfie-video reactions are V2, deferred.

```ts
reactions: defineTable({
  dropId: v.id("drops"),
  reactorId: v.id("profiles"),
  emoji: v.union(v.literal("🔥"), v.literal("💪"), v.literal("👀"), v.literal("💯")),
  createdAt: v.number(),
})
  .index("by_drop", ["dropId"])
  .index("by_drop_reactor", ["dropId", "reactorId"]); // dedup: max one reaction per (drop, reactor)
```

**Why dedup index**: a single user reacting twice to the same drop should overwrite, not create two rows. Mutation looks up via `by_drop_reactor` and patches if exists.

### `views`

Who has seen which drop (BeReal-style "seen by" list).

```ts
views: defineTable({
  dropId: v.id("drops"),
  viewerId: v.id("profiles"),
  viewedAt: v.number(),
})
  .index("by_drop", ["dropId"])
  .index("by_drop_viewer", ["dropId", "viewerId"]); // dedup: one view row per pair
```

### `userStats`

Denormalized counters. Updated atomically in the same mutation that creates a drop / accepts a reaction. Read by profile screens and feed cards on every render — fast lookup matters.

```ts
userStats: defineTable({
  profileId: v.id("profiles"),
  totalXp: v.number(),
  level: v.number(), // computed via packages/domain.levelFromXP
  streak: v.number(), // current consecutive drop-days in user's timezone
  longestStreak: v.number(),
  graceCardsAvailable: v.number(), // VISION §5.3: 1 per 30-day window, earned at 7-day streak
  lastDropDayKey: v.optional(v.string()), // "YYYY-MM-DD"; used to detect streak break/extension
  totalDrops: v.number(),
  updatedAt: v.number(),
}).index("by_profile", ["profileId"]);
```

**Why denormalize**: VISION §6.4 specifies it. Every drop the user creates and every drop they view triggers a recompute, which Convex transactions handle atomically. The price is one extra `ctx.db.patch` per mutation; the win is no aggregation on read.

### `activityEvents`

Append-only audit log of significant moments — XP gains, level-ups, streak milestones, friendship accepts. Used in Phase 4 for the "X reached level 5" / "Y is on a 30-day streak" notification ideas, and as a sanity check in case `userStats` ever drifts.

```ts
activityEvents: defineTable({
  profileId: v.id("profiles"),
  kind: v.union(
    v.literal("drop_created"),
    v.literal("xp_gained"),
    v.literal("level_up"),
    v.literal("streak_milestone"), // 7, 14, 30, 60, 100…
    v.literal("grace_card_earned"),
    v.literal("grace_card_consumed"),
    v.literal("friendship_accepted"),
  ),
  // Free-form payload, validated per-kind in the writer. Convex `v.any()` is intentional here.
  payload: v.any(),
  createdAt: v.number(),
}).index("by_profile_created", ["profileId", "createdAt"]);
```

---

## Mutations

All mutations enforce auth via `ctx.auth.getUserIdentity()` and resolve the caller's `profileId` via the existing `by_clerk_user_id` index on `profiles`. A small helper `requireCallerProfile(ctx)` in `packages/convex/convex/_helpers.ts` does this once.

### Friendships

```ts
friendships.request(args: { otherProfileId: Id<"profiles"> })
  → Id<"friendships">
```

Creates a `pending` row in canonical pair order. Idempotent: if a row already exists for the pair, returns its id (does not duplicate or re-open declined). Errors if `otherProfileId === self`.

```ts
friendships.accept(args: { friendshipId: Id<"friendships"> })
  → null
```

Errors if caller is not the non-requester side. Sets `status: "accepted"`, `acceptedAt: now`. Inserts an `activityEvents` row of kind `friendship_accepted` for both sides.

```ts
friendships.decline(args: { friendshipId: Id<"friendships"> })
  → null
```

Deletes the row. (Not just sets to "declined" — keeps the table small. Re-requesting later starts fresh.)

### Todos

```ts
todos.create(args: { text: string; difficulty: "easy"|"medium"|"hard" })
  → Id<"todos">
```

Creates an open todo for today (in caller's timezone, derived from `profile.timezone`). Validates `text.length <= 280`.

```ts
todos.complete(args: { todoId: Id<"todos"> })
  → null
```

Sets `completedAt`. Does NOT auto-create a drop — Phase 3 UI triggers `drops.create` separately within the 60s window.

### Drops

```ts
drops.create(args: {
  todoId?: Id<"todos">;            // optional — ad-hoc drops allowed
  caption: string;                  // max 100
  tags: string[];                   // normalized to lowercase, deduped, max 5
  difficulty: "easy"|"medium"|"hard";
  visibility: "circle"|"just_me";
  photoFileId?: Id<"_storage">;     // optional in Phase 2 (text-only via dashboard for testing)
  voiceFileId?: Id<"_storage">;
}) → Id<"drops">
```

Atomic transaction:

1. Resolve `dayKey` from caller's `profile.timezone`.
2. Compute `xpAwarded` via `@commit/domain.calculateXP(difficulty, currentStreak)`.
3. Insert the `drops` row.
4. Patch the linked `todos` row (set `dropId`).
5. Recompute `userStats` for the caller — increment `totalXp`, recompute `level`, advance `streak` if `dayKey > lastDropDayKey`, set `lastDropDayKey`. Award a grace card if streak just hit 7-day mark.
6. Insert `activityEvents` rows: `drop_created`, conditional `level_up` / `streak_milestone` / `grace_card_earned`.

All in one Convex mutation = all atomic. If any step throws, none of it persists.

### Reactions

```ts
reactions.toggle(args: { dropId: Id<"drops">; emoji: "🔥"|"💪"|"👀"|"💯" })
  → "added" | "updated" | "removed"
```

Looks up via `by_drop_reactor`. If no row, insert + increment `drops.reactionCount`. If row exists with same emoji, delete + decrement. If row exists with different emoji, patch the emoji (no count change).

### Views

```ts
views.markSeen(args: { dropId: Id<"drops"> })
  → null
```

Idempotent. Inserts only if `(dropId, viewerId)` doesn't already exist; then increments `drops.viewCount`.

---

## Queries

### `friendships.listForUser`

```ts
friendships.listForUser({ status?: "pending"|"accepted" })
  → Array<{ profile: Profile; friendship: Friendship; iAmRequester: boolean }>
```

Resolves caller, looks up via `by_low` and `by_high` indexes (caller might be either side), unions, dedupes. Returns the OTHER user's profile alongside the friendship row. Used by the friends list and the pending-requests inbox.

### `todos.todayForUser`

```ts
todos.todayForUser() → Todo[]
```

Lookup via `by_owner_day` with `dayKey = today in caller's timezone`. Trivial.

### `drops.feedForUser` — **the reciprocity-locked query**

```ts
drops.feedForUser({ dayKey?: string })
  → { locked: true;  blurredCount: number }
  | { locked: false; drops: Array<EnrichedDrop> }
```

The single most important query in the codebase. Server-enforced:

```ts
export const feedForUser = query({
  args: { dayKey: v.optional(v.string()) },
  returns: v.union(
    v.object({ locked: v.literal(true), blurredCount: v.number() }),
    v.object({ locked: v.literal(false), drops: v.array(/* EnrichedDrop validator */) }),
  ),
  handler: async (ctx, args) => {
    const me = await requireCallerProfile(ctx);
    const today = args.dayKey ?? dayKeyInTimezone(Date.now(), me.timezone);
    const callerDroppedToday = await hasDroppedToday(ctx.db, me._id, today);

    if (!callerDroppedToday) {
      const blurredCount = await countTodaysFriendDrops(ctx.db, me._id, today);
      return { locked: true, blurredCount };
    }

    return { locked: false, drops: await fetchFriendDropsToday(ctx.db, me._id, today) };
  },
});
```

`hasDroppedToday`, `countTodaysFriendDrops`, `fetchFriendDropsToday` are private helpers in `packages/convex/convex/_helpers.ts`. `dayKeyInTimezone` lives in `packages/domain/`.

**Why server-enforced**: a determined user could ship a fork of the mobile app that ignores `locked: true`. The server returning blurred-count-only ensures even a hostile client cannot read today's drops without dropping themselves.

### Profile / stats

```ts
userStats.forCaller() → UserStats | null   // self
userStats.forProfile({ profileId }) → UserStats | null   // any friend
```

Direct index lookup via `by_profile`. Used by the profile screens.

---

## Domain logic — `packages/domain/src/`

Pure TypeScript, no Convex imports. Each function is unit-tested with Vitest. Convex mutations import these and call them.

```ts
// day-key.ts
export function dayKeyInTimezone(unixMs: number, ianaTz: string): string;
//   "YYYY-MM-DD" in the given IANA zone. Uses Intl.DateTimeFormat — same in V8 + Node.

// xp.ts
export const XP_BY_DIFFICULTY = { easy: 30, medium: 60, hard: 120 } as const;
export function streakMultiplier(streak: number): number;
//   1.0x at streak<7, ramping linearly to 2.0x at streak>=30. VISION §5.4.
export function calculateXP(diff: keyof typeof XP_BY_DIFFICULTY, streak: number): number;
//   Math.round(XP_BY_DIFFICULTY[diff] * streakMultiplier(streak))

// level.ts
export function levelFromXP(totalXp: number): number;
//   Math.floor(Math.sqrt(totalXp / 50)). VISION §5.4.

// streak.ts
export function streakAfterDrop(args: {
  previousStreak: number;
  lastDropDayKey: string | undefined;
  newDropDayKey: string;
  graceCardsAvailable: number;
}): { newStreak: number; consumeGraceCard: boolean; brokenAndReset: boolean };
//   Encodes VISION §5.3 rules: same-day no-op, consecutive-day +1, gap-day-with-grace consume,
//   gap-day-no-grace reset to 1.

// friendship.ts
export function canonicalPair(a: string, b: string): { low: string; high: string };
//   Sort by string compare. Used by every friendship mutation.

// reciprocity.ts
export function shouldLockFeed(args: { callerHasDroppedToday: boolean }): boolean;
//   Trivially true for V1; lives here so future tweaks (grace period for new users etc.) have a home.
```

**Test coverage targets** (`packages/domain/tests/`):

- `dayKeyInTimezone`: midnight boundaries, DST forward/back, two users in different timezones at the same UTC instant.
- `calculateXP`: all three difficulties at streak 0, 6, 7, 29, 30, 100. Verify Math.round rounding isn't off-by-one.
- `levelFromXP`: 0 → level 0, 49 → 0, 50 → 1, 199 → 1, 200 → 2, 4999 → 9, 5000 → 10.
- `streakAfterDrop`: same-day, consecutive, gap-with-grace, gap-no-grace, first-ever drop (`lastDropDayKey === undefined`).
- `canonicalPair`: a<b, a>b, a===b (should throw).

Aim for 100% line coverage on these — they're cheap to test and load-bearing.

---

## The reciprocity-lock — implementation pattern

This is the linchpin of the product (VISION §5.1). Three places enforce it:

1. **Server query** (`drops.feedForUser` above) — refuses to return today's friend drops to a non-dropper. Cannot be client-bypassed.
2. **Client UI** (Phase 3) — renders the blurred-count screen when query returns `locked: true`. Cosmetic only; the server already protects the data.
3. **Grace period for new users** (VISION §5.1: "First-time users get a 24-hour grace period"). Implemented as a comparison: `if (now - profile.createdAt < 24h) return locked: false`. Kept in `reciprocity.shouldLockFeed` so it's testable.

**Yesterday and earlier are NOT locked** — only today. That matters because the query must filter by `dayKey === today`, not by date range.

---

## Testing strategy

Three layers:

1. **Vitest unit tests** for `packages/domain/`. Fast, deterministic, run in CI on every PR. Target 100% line coverage on domain logic.
2. **Convex dashboard manual smoke tests** for mutations and queries. Use the function-runner UI to call `friendships.request`, `drops.create`, `drops.feedForUser` against the dev deployment with two test profiles.
3. **convex-test integration tests** (optional, deferred to Phase 5 polish). The `convex-test` package gives an in-memory Convex runtime where you can call mutations from Vitest. Worth the setup once the schema stabilizes.

No mobile UI tests in Phase 2 — there's no UI yet. Phase 3 adds Detox or Maestro if needed.

---

## Subtasks (execution order)

Numbered for the plan-mode session that kicks off this phase. Each is a coherent unit of work and a sensible commit boundary.

1. Create `packages/convex/convex/_helpers.ts` with `requireCallerProfile`, `dayKeyForCaller`, `hasDroppedToday`, `countTodaysFriendDrops`, `fetchFriendDropsToday`. Pure stubs first; bodies as tables come online.
2. Add `todos`, `drops`, `friendships`, `reactions`, `views`, `userStats`, `activityEvents` to `schema.ts` (single commit). Run `npx convex dev` to push the schema; verify in dashboard.
3. Build out `packages/domain/src/` with all the pure functions above. Write Vitest tests as you go — green tests gate the next step.
4. Implement `friendships.*` mutations and `friendships.listForUser` query. Smoke-test via dashboard with two profiles.
5. Implement `todos.create` and `todos.complete`. Smoke-test.
6. Implement `drops.create` (the big atomic transaction). Smoke-test creating a drop with no media (text-only is fine in Phase 2). Verify `userStats` updates correctly.
7. Implement `drops.feedForUser` with the full reciprocity-lock logic. Two-profile smoke test: A drops, B asks for feed → locked. B drops, B asks for feed → unlocked, sees A's drop.
8. Implement `reactions.toggle` and `views.markSeen`. Smoke-test that `drops.reactionCount` and `drops.viewCount` stay correct.
9. `userStats.forCaller` and `userStats.forProfile`. Trivial.
10. End-to-end manual run-through via dashboard following the "End state" scenario below. Document anything weird in `docs/phase-2-core-data.md`.

Estimated effort: 5 working days of focused work (subtasks 2–7 are the bulk; 1, 8, 9, 10 are short).

---

## Risks & gotchas

1. **Timezone correctness.** `Intl.DateTimeFormat` runs in both V8 and Node, but verify your specific Convex region's V8 build supports the IANA database your users live in. Test with at least Europe/Berlin (founder), America/Los_Angeles, Asia/Tokyo.
2. **DST transitions.** A user in `Europe/Berlin` near the spring DST jump can see a 23-hour day. `dayKeyInTimezone` based on `Intl.DateTimeFormat` handles this correctly; tests must explicitly cover both DST directions.
3. **Atomicity of `drops.create`.** Inserting the drop, patching the todo, updating `userStats`, and inserting `activityEvents` must all be in one mutation handler — Convex guarantees atomicity per-mutation. Don't split across mutations.
4. **Friendship canonical pair drift.** If two paths compute the canonical pair differently, you'll get duplicate rows. Lock it behind `canonicalPair()` in `packages/domain` and never sort manually elsewhere.
5. **`xpAwarded` immutability.** Once a drop is created, never recompute `xpAwarded` from current state. Even if the formula changes in V2, history is preserved. Document this rule in `drops.ts`.
6. **`v.any()` on `activityEvents.payload`.** Convex's runtime validators don't enforce shape inside `v.any()`. Add a TypeScript discriminated union for `payload` in domain code, and validate-on-write in mutation helpers.
7. **No grace-card double-award.** A user reaching streak 7 must earn one grace card, not one per drop on day 7. Check `userStats.lastDropDayKey` before awarding.
8. **`drops.feedForUser` performance.** With N friends and M drops/day, current design is N+1: one query per friend. Acceptable up to ~50 friends. Phase 4 may add a denormalized `feedShard` table if circles grow past that.
9. **Validators must be exhaustive.** Convex `returns` validators run at runtime — if you forget a field, queries fail in production. Match every field declared in the table; use `v.union` for enums; never use `v.any()` in returns.
10. **Convex `_generated/` regeneration.** Adding tables triggers regeneration. Re-run `pnpm typecheck` after every schema change to catch downstream type breakage early.

---

## End state

Through the Convex dashboard, this scenario passes end-to-end:

1. Create profile A and profile B (both via the existing `profiles.upsert` from a real Clerk login on iPhone, or directly via dashboard with manual `clerkUserId` values for pure backend testing).
2. A calls `friendships.request({ otherProfileId: B._id })` → row in `pending`.
3. B calls `friendships.accept({ friendshipId })` → row in `accepted`. Activity events for both.
4. B calls `drops.feedForUser()` → `{ locked: true, blurredCount: 0 }` (no friends have dropped today).
5. A calls `todos.create({ text: "ship the schema", difficulty: "hard" })` then `todos.complete({ todoId })`.
6. A calls `drops.create({ todoId, caption: "shipped Phase 2", tags: ["@build"], difficulty: "hard", visibility: "circle" })`. `xpAwarded === 120`. `userStats.streak === 1`. `lastDropDayKey === today`.
7. B calls `drops.feedForUser()` → still `{ locked: true, blurredCount: 1 }` (A dropped, but B hasn't).
8. B creates and completes a todo, drops on it.
9. B calls `drops.feedForUser()` → `{ locked: false, drops: [A's drop] }`. **The lock just unlocked exactly when it should.**
10. B calls `reactions.toggle({ dropId: A._id, emoji: "🔥" })` → `"added"`. A's `drops.reactionCount === 1`.
11. All `userStats` rows are correct, all `activityEvents` rows present, no orphaned writes.

When step 9 transitions cleanly, **the heart of the product works**. Phase 3 just makes it pretty.
