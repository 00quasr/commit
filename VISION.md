# commit — Vision & Build Spec

**Document version:** v1.0
**Last updated:** May 2026
**Author:** Keanu
**Status:** Pre-build, pre-beta

---

## 1. The One-Sentence Pitch

**commit is a publicly available habit-tracker with BeReal-style proof. You set goals — code daily, gym every other day, language practice on weekdays — and prove you did them with a photo+voice drop. See your accepted friends' drops in a reciprocity-locked feed; show up on your own public profile with a GitHub-contribution-style heatmap of every drop you've shipped.**

Think Strava + BeReal for any goal worth committing to. Anyone can sign up — indie builders, fitness people, language learners, students, makers — but real visibility runs through mutual-accept friendships, distributed openly via the App Store.

---

## 2. The Problem

### 2.1 The macro problem

Productivity tools have hit a ceiling. Todoist, Things, Notion, Sunsama — all converge on the same insight: a better list does not produce better outcomes. The bottleneck is not organization. It is **accountability and consistency**. People know what they should do. They struggle to do it daily, especially without external pressure.

### 2.2 Why existing solutions fail

- **Todo apps** (Todoist, Things, Apple Reminders): Pure tools. No social pressure. Easy to ignore.
- **Habit trackers** (Streaks, Habitica, Finch): Gamify the user against themselves. Lonely. No real stake.
- **Productivity Twitter / Build-in-Public on X**: The right energy, but the platform is a casino — algorithm rewards drama, not consistency. Posts are performative, not authenticated. No way to tell who actually shipped from who tweeted about shipping.
- **Strava**: Closest spiritual sibling. Works because activities are auto-tracked (GPS) and photos are common. But it is sport-only.
- **BeReal**: Proved the reciprocity-lock mechanic works. But the content is decorative, not productive.

There is no tool that combines **authenticated daily output proof** + **a small accountable circle** + **lightweight social pressure** for non-sport work.

### 2.3 The user pain in plain language

> "I posted on X that I am working on Project Y. Three weeks later I have shipped nothing. Nobody asks. Nobody notices. The thing dies quietly."

That is the gap. commit closes it.

---

## 3. The Product

### 3.1 What commit is

A publicly distributed mobile-first habit tracker with social proof. The two units of the product:

- A **habit** is a recurring commitment with a cycle: daily ("code 1h"), every-2-days ("gym"), weekly ("call mom"). Each habit has a difficulty (easy / medium / hard) that drives XP. You can have many habits; each has its own cycle but all roll up into one global daily streak.
- A **drop** is the proof that you did a habit on a given day. A drop contains:
  - A short caption (what you committed to and finished)
  - A dual-camera photo (front + back, simultaneously, BeReal-style)
  - An optional 30-second voice memo
  - Tags (`@build`, `@health`, `@create`, `@learn`, etc.)
  - The habit it counts toward (optional — ad-hoc drops without a habit are also fine)
  - XP earned (scales with difficulty + current streak)
  - A timestamp and optional location
  - Visibility: `public` (anyone with the profile URL), `friends` (accepted friends only — the default), or `private` (just-me, counts for streak/XP)

Drops appear in your home feed, populated by your **accepted friends** — people you've mutually friended (request → accept, BeReal-style). Friends react with selfie-videos or short voice notes.

Each user has a public profile page at `commit.app/{username}` that shows display name, avatar, current streak, total XP, **public** drops only, and a GitHub-contribution-style heatmap of every drop you've shipped. Friends-only and private drops are not exposed to non-friends. This is what makes `commit` a public app: anyone can sign up, browse profiles, and request friendships, even before sending their first drop.

The product has **one hard rule**: _if you have not dropped today, you cannot see your home feed of friends' drops today_. The feed is locked behind your own commitment. Public profile pages remain browsable regardless. This is the reciprocity-lock mechanic that BeReal proved works — applied to habit accountability.

### 3.2 What commit is NOT

This is as important as what it is. The following are explicitly out of scope, both for V1 and likely forever:

- **Not a todo app for organizing your week.** No projects, no Kanban, no Eisenhower matrices. Habits are recurring commitments, not one-off tasks. Use Things or paper for serious planning.
- **Not a chat / DM platform.** Reactions yes. Conversations no. Kept friction in the right places.
- **Not an open social network.** The social graph is mutual-accept friendships, not one-way follows. Public profiles exist for discoverability, but real content visibility runs through accepted friendships. No "discover-the-world" algorithmic feed in V1.
- **Not for teams or work.** No org accounts, no manager dashboards, no Jira integrations. This is personal.
- **Not free forever.** V1 is free. Once retention is proven, $5/month soft paywall on friend cap > 8 (free tier) and advanced stats / AI weekly review. Revenue model is intentional simplicity.

### 3.3 The mechanic, end-to-end

A typical day for a user:

1. **Morning, opens app.** Lands on `/today` tab. Sees habits **due today** based on each habit's cycle (daily habits show every day; every-2-days habits show every other day; etc.). Add a new habit at any time with `+`.
2. **During the day, does the habit.** Taps the habit's checkbox.
3. **App prompts: "Drop it. 60 seconds."** A countdown starts. Camera opens, front+back simultaneously. User takes the proof.
4. **Optional 30-second voice memo.** "Just shipped this thing, here is why I am stoked."
5. **Caption + tags.** 100 character limit. Auto-suggested tags by Claude.
6. **Drop posts to accepted friends.** Push notifications fire to friends. If the drop is marked `public`, it is also visible on the user's profile page at `commit.app/{username}` to anyone with the URL.
7. **Friends see the drop.** They react with selfie-video or voice. User gets a notification per reaction.
8. **End of day.** User has dropped 1-3 times across their due habits. Global streak continues.
9. **If user did not drop today (any habit).** Their home feed of friends' drops is locked tomorrow morning until they drop something. Public profile pages remain browsable. Streak breaks at midnight (in their timezone).

That is the loop. Everything else in the product is in service of this loop.

---

## 4. Target User

The product itself works for **anyone with goals worth committing to** — coders, lifters, language learners, writers, students, founders, anyone with a habit they want to keep. The audience isn't narrow; the cold-start cluster is.

### 4.1 V1 beta cluster (the first 100 users)

**Indie builders and Builders-in-Public on X (Twitter).** This is the _seeding_ group, not the _target audience_ — they're who we cold-start with so the network feels alive on day one. Specifically:

- Solo founders shipping side projects
- Bootstrapped SaaS founders
- Open-source maintainers
- Newsletter writers, course creators, info-product builders
- People with 500-50k followers on X who already post about their daily work

**Why this cluster for cold-start:**

- **They already perform the behavior.** They post their day on X. commit gives them a better, more authenticated container for the same impulse.
- **They are tightly clustered socially.** They all follow each other. They reply to each other. Network effects are local and fast.
- **They believe in the product wedge.** "Accountability with proof" is a value most of them already hold.
- **The founder is in the cluster.** Keanu is on X, building in public, with peers like Melwin, Patrick, Tom in the same scene. Initial 20 users come from existing relationships, not paid acquisition.
- **They evangelize.** Indie builders post about every tool they try. Free distribution.

Once the mechanic is proven here, the same product serves anyone with daily/cyclical commitments — fitness, language, study, creative practice. No re-architecting required: cycles are core, audience is incidental.

### 4.2 V2+ expansion

Once the mechanic is proven with indie builders, expand outward in this order:

1. **Adjacent creator clusters.** YouTubers, music producers, designers — same daily-output pattern, different vertical.
2. **Self-improvement / fitness crowd.** Marathon trainees, lifters, language learners. Strava-like adjacent.
3. **Students and lifelong learners.** Bar prep, medical school, language acquisition.
4. **General productivity audience.** Only after V1, V2, V3 work.

The temptation is to skip ahead and target "everyone with todos." This is a mistake. Cluster-first is non-negotiable until product-market fit is proven in cluster one.

### 4.3 Anti-personas (who commit is NOT for)

- People who hate posting anything publicly
- Teams or work-collaborators (this is personal commitment, not project management)
- Privacy-maximalists who want a quiet single-player tool (use Streaks)
- People without 3-5 close friends willing to install a new app

---

## 5. Core Mechanics in Detail

### 5.1 The reciprocity-lock

The single most important product decision.

**Rule:** If you have not posted at least one drop today (in your timezone), you cannot view your friends' drops from today. You see yesterday and earlier; today is blurred.

**Why it works:**

- It creates engagement asymmetry. The "lazy lurker" pattern that kills most social apps cannot exist here.
- It produces FOMO, which produces action.
- It enforces the contract: this is a community of doers, not watchers.

**Implementation note:** First-time users get a 24-hour grace period to explore the feed before the lock activates. After that, the lock is hard.

### 5.2 The drop window

When a user marks a todo as done, a 60-second countdown starts. Within that window, they must take the dual-camera photo and complete the drop.

**Why a window:**

- Prevents users from dropping curated, polished content. The photo should be of the actual thing, in the actual moment.
- Mirrors BeReal's 2-minute window which proved that time-pressure produces authenticity.
- Removes the cognitive load of "I will drop this later." Drop now or drop never.

**If they miss the window:** The todo is marked done in their private list, but no drop is created. They can still complete other todos later. The drop is the social commitment, not the todo itself.

### 5.3 Streaks

A streak is the count of consecutive days with at least one drop.

**Rules:**

- Streak resets at midnight (user's timezone) if no drop that day
- Maximum 1 grace day per 30-day window (a "skip card") — earned by dropping 7 days in a row
- Streaks are visible to circle, prominent in profile

**Why streaks:**

- Single most powerful retention mechanic in any consumer app (Duolingo's secret)
- Provides loss-aversion psychology
- The pain of breaking a 28-day streak keeps you dropping on day 29

### 5.4 XP and levels

XP is earned per drop, scaled by todo difficulty (Easy 30 / Medium 60 / Hard 120) and current streak (multiplier 1.0x → 2.0x at 30+ days).

Levels are computed: `level = floor(sqrt(total_xp / 50))`. This means early levels come fast, later ones are prestige markers.

**Purpose:**

- Provides a long-tail progression beyond streaks
- Public level visible on profile creates flex
- Gives reactivation value to lapsed users (they have invested in their level)

### 5.5 Reactions

Friends can react to a drop. Reactions are not emoji.

**V1 reactions (Beta):** A small fixed set of stickers/badges that feel personal — `🔥` `💪` `👀` `💯`. Implemented first because emoji-reactions ship in 2 days vs. 1 week for video.

**V2 reactions:** **RealMojis-style selfie-videos.** 2-second self-recording on tap, attached to the drop. Way more personal. Signature feature when it lands.

**V3 reactions:** Voice-note replies (5-second max).

### 5.6 Friendships

Each user has accepted friends. Friendship is bidirectional and explicit (request → accept) — BeReal-style, not Twitter-style follow. Mutual accept is the gate that controls visibility of `friends`-tier drops.

**Free tier soft cap:** 8 friends. This nudges toward tight, accountable groups instead of follower-style hoarding — larger circles dilute the social pressure that makes the product work. The cap is a soft default: users can request to be excluded; the V2 Pro tier formalizes a higher cap (e.g. 30 friends).

**Public profiles** at `commit.app/{username}` are browsable by anyone, signed-in or not — this is what makes `commit` "publicly available." The profile page shows display name, avatar, current streak, total XP, and the user's `public`-tier drops only. Friends-only and private drops are not exposed.

### 5.7 Privacy levels per drop

Each drop has a visibility setting at creation time. **Three tiers, V1 default:**

- **`public`:** Visible to anyone with the profile URL (`commit.app/{username}`), signed-in or not. Use for drops you're proud to share publicly. Indexable by search engines.
- **`friends` (default):** Visible to your accepted friends only. The most common choice — the social-pressure mechanic happens here.
- **`private`:** The drop counts for streaks and XP but is not visible to anyone else. For days you finished something private and don't want to share.

A drop's visibility is locked at creation time and cannot be changed afterward — keeps the data model honest and removes a class of user mistakes.

---

## 6. Technical Architecture

### 6.1 Stack decision summary

| Layer                  | Choice                                                              | Rationale                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Mobile App**         | React Native + Expo                                                 | Single codebase iOS+Android, EAS for builds, OTA updates, mature camera/audio APIs                                          |
| **Marketing Landing**  | Next.js 15 + Tailwind + shadcn/ui                                   | Fast, SEO-friendly, hosted on Vercel FRA1                                                                                   |
| **Backend / DB**       | Convex                                                              | Realtime queries first-class (perfect for live feed), TypeScript end-to-end, transactional mutations, file storage built-in |
| **Auth**               | Clerk                                                               | Best Convex integration, social sign-in (Apple, Google), EU-region available                                                |
| **AI Layer**           | Anthropic API (Claude Haiku 4.5) via Convex Actions                 | Task breakdown, auto-tagging                                                                                                |
| **File Storage**       | Convex File Storage initially → Cloudflare R2 once >50 active users | Cost optimization                                                                                                           |
| **Push Notifications** | Expo Push Service                                                   | Free, battle-tested, EU-routable                                                                                            |
| **Email**              | Resend                                                              | For invites, digests, transactional                                                                                         |
| **Monitoring**         | Sentry + PostHog                                                    | Crash tracking + product analytics + session replay                                                                         |
| **Hosting (web)**      | Vercel                                                              | FRA1 region, preview deploys                                                                                                |

### 6.2 Why this stack and not alternatives

**Why Convex over Supabase / Postgres:**

- Realtime is first-class, not bolted on. Friend feed updates push automatically without subscription gymnastics.
- Mutations are transactional by default. Creating a drop = update streak + insert event + award XP atomically.
- TypeScript-native. Schema, queries, mutations all in TS, frontend gets typed automatically.
- Trade-off accepted: vendor lock-in. For an MVP this is acceptable. Migration is feasible if needed.

**Why Expo over native Swift / Kotlin:**

- Solo founder. One codebase ships to both platforms.
- EAS Build removes Xcode/Mac requirement.
- OTA updates skip App Store review for JS-only changes.
- Camera, audio, push notifications are all production-ready in Expo SDK.
- Trade-off accepted: dual-camera simultaneous capture has limitations on iOS Safari, but is workable in native Expo with `expo-camera` SDK 14+.

**Why Clerk over Auth.js / Supabase Auth:**

- Easiest Convex integration (officially supported, documented).
- Social sign-in built in.
- EU hosting available, GDPR-friendly.
- Free up to 10k MAU.

### 6.3 Repo structure

A monorepo with Turborepo. Even at MVP this is worth it because shared business logic (streak calculation, XP rules, reciprocity-lock check) lives in one place between mobile app and the backend.

```
commit/
├── apps/
│   ├── mobile/              Expo React Native app (the actual product)
│   └── web/                 Next.js 15 marketing landing
├── packages/
│   ├── convex/              Convex schema + queries + mutations + actions
│   ├── domain/              Pure TS business logic (XP, streaks, reciprocity)
│   ├── ui-tokens/           Design tokens, color schema, fonts (shared)
│   └── config/              ESLint, Prettier, tsconfig base
├── turbo.json
├── pnpm-workspace.yaml
├── VISION.md                this file
└── README.md
```

### 6.4 Data model (high level)

The schema centers on these core entities:

- **profiles** — extends Clerk user with username, `usernameLower` (case-insensitive uniqueness for public URLs), avatar, timezone, bio. Indexed by `clerkUserId` and `usernameLower`.
- **friendships** — bidirectional mutual-accept, with status (pending / accepted). Stored as a single canonical row per pair (`pairLow < pairHigh`).
- **habits** — recurring commitment definitions. Each has a `cycleDays` (1 = daily, 2 = every other day, 7 = weekly, up to 31), `createdDayKey`, optional `lastDropDayKey` (denormalized for fast dueToday queries), and `archived` (soft delete). Difficulty drives XP per drop.
- **drops** — the proof posts; optionally reference a habit (ad-hoc drops also allowed), photo, voice memo, tags. Three visibility tiers: `public`, `friends`, `private`. Tied to a `dayKey` in the owner's timezone — that's what the reciprocity-lock check matches against.
- **reactions** — emoji or selfie-video reaction on a drop
- **views** — who has viewed which drop (BeReal-style "seen by" list)
- **userStats** — denormalized **global** streak, XP, level for fast reads. Streak is one global counter across all drops — not per-habit. Drop on any habit today → streak +1; miss a day with no grace card → reset to 1.
- **activityEvents** — audit log of XP gains, level-ups, streak milestones

Full schema lives in `/packages/convex/convex/schema.ts`.

### 6.5 The reciprocity-lock implementation

The most important query in the codebase:

```typescript
// pseudo-code
async function getTodaysFeed(userId) {
  const userDroppedToday = await hasDroppedToday(userId);
  if (!userDroppedToday) {
    return { locked: true, blurredCount: await countTodaysFriendDrops(userId) };
  }
  return { locked: false, drops: await fetchFriendDropsToday(userId) };
}
```

This single function determines whether the feed renders or shows the blur-screen. Server-side enforced; cannot be bypassed by client manipulation.

---

## 7. Design Language

### 7.1 Visual identity

- **Black background** (`#050505`), white foreground. No accent color in V1.
- **Apple-aesthetic fundamentals:** atmospheric radial glows, premium app icon (white squircle with dark glyph), generous whitespace, typography-driven hierarchy
- **Geist** for primary text, **Geist Mono** for technical metadata (timestamps, XP, streak counts, location)
- **Reference apps for visual language:** Linear, Raycast, Vercel, Remodex
- **Reference apps for UX patterns:** BeReal (reciprocity, dual-cam), Strava (activity feed), Instagram (vertical feed cards)

### 7.2 Why pure black-and-white in V1

- Makes the photos the only colorful thing in the app — they pop
- Establishes a premium, intentional brand
- Removes the temptation to over-design with color states
- One less variable to A/B test in beta

### 7.3 Tone of voice

- Direct, slightly knowing, no marketing-fluff
- "Stop drifting. Start finishing."
- "The drop is the proof."
- "Drop or it didn't happen."
- Avoid: cheerleader-tone (`You got this!`), corporate-tone (`Boost your productivity`), gamified-tone (`Level up today!`)

---

## 8. Build Roadmap (6-Week MVP to Beta)

### Phase 0 — Pre-build (Days 1-2)

Domain registration (`commit.app`), Apple Developer Account submission (3-day verification window), all SaaS account setup (Convex, Clerk, Expo, Vercel, Sentry, Resend), and writing this VISION.md.

### Phase 1 — Foundation (Days 3-7)

Monorepo setup with Turborepo. Expo app boots and authenticates via Clerk. Marketing landing on Vercel. Convex schema deployed. End state: "Hello, [name]" round-trips through the full stack on a real iPhone.

### Phase 2 — Core data & friendships (Days 8-12)

Convex schema for profiles, drops, friendships, reactions, views. All mutations and queries written and unit-testable through Convex dashboard. No UI yet. End state: two profiles can become friends, one can create a drop, the other can see it via query — but only if they also dropped today.

### Phase 3 — The drop flow (Days 13-19)

The product week. Camera screen with `expo-camera`, voice memo recorder with `expo-av`, caption + tags screen, upload pipeline, feed screen with the reciprocity-lock UI. End state: full drop loop works on a real device, shareable to a friend's device.

### Phase 4 — Social layer (Days 20-26)

Reactions (V1 emoji-style), Expo push notifications with deep links, streak counter UI, XP / level display, basic onboarding (3 screens), friend invite via SMS share-link, and the **public profile route** on `apps/web` at `/{username}` (server-rendered, indexable, shows public drops + streak). End state: a stranger could install the app, complete onboarding, and use it without a manual; profile URLs are shareable to the open web.

### Phase 5 — Polish & App Store submission (Days 27-33)

Performance optimization (optimistic UI, image caching, feed pagination), edge-case handling (no friends, camera-denied, connection-loss retries), settings + profile screen, GDPR-compliant delete-account flow, marketing landing finalized. EAS Build → **App Store submission** as the primary distribution channel. TestFlight Internal Testing as a stepping stone, not the endpoint. End state: 5-10 personal beta testers on TestFlight, App Store submission in review.

### Phase 6 — Public Beta and App Store Launch (Weeks 5-6)

App Store listing live (the app is now publicly available). TestFlight Public Link as a fallback while review is pending. X build-in-public launch with daily drop screenshots and shareable profile URLs (`commit.app/{username}`). Indie Hackers + r/SideProject + Hacker News Show HN. Discord server for beta feedback. **No new features in this phase.** Listening mode only. End state: 50-100 beta users with the app freely installable from the App Store, qualitative + quantitative signals on whether the mechanic works.

---

## 9. Cold-Start Strategy

The single largest risk for any social app. The plan:

### 9.1 The "Lock-In Five"

Two weeks before public beta, identify 5 close friends who agree to start using commit on the same day. Specifically:

- Melwin (co-founder Agent Vault, in the build-in-public scene)
- 4 others from Keanu's existing X / build-in-public network
- All commit to dropping daily for 14 days minimum

**This is not marketing, this is product launch.** Without a tight initial cluster, the app feels dead, the lock feels punishing, and retention dies. Every BeReal-style app that failed cold-started solo or in too-loose a network. Mutual-accept friendships make this even more critical: both sides must sign up and accept for content to flow.

The public App Store distribution accelerates density once the cluster is seeded — casual signups can find and request friendship with the founder cluster via shareable profile URLs (`commit.app/keanu`), accelerating the network past its critical mass faster than a closed-beta would.

### 9.2 The X build-in-public funnel

Keanu drops daily. The drop gets crossposted to X with a screenshot and the public profile URL (`commit.app/keanu`). Caption: "shipped X today on commit.app — install from the App Store, friend me, drop tomorrow." Direct DMs to interested replies offering App Store link + a friend-request preflight.

This is high-effort but produces ultra-targeted users (people who already understand the wedge and convert to drops at high rates). Estimated 2-5 new users per day during launch month.

### 9.3 What we explicitly do NOT do

- No paid acquisition before retention is proven (CAC will be infinite if the mechanic does not click)
- No Product Hunt launch yet (save for V1 public release after cluster is dense)
- No "viral mechanics" beyond the reciprocity-lock (no growth hacks, no contests, no referral bonuses)
- No press outreach until 500+ active users

---

## 10. Success Metrics

What "working" looks like at each stage:

### 10.1 TestFlight Internal (end of Week 4)

- 5+ daily active testers
- 3+ drops per day per active user
- Zero-crash rate >99%
- Subjective: testers say "I find myself opening this without thinking"

### 10.2 Public Beta (end of Week 6)

- 50+ users
- 30%+ Day-7 retention (industry benchmark for social apps is 25%)
- 2+ drops per day per active user
- 80%+ of drops include the photo (proof that the mechanic is being used as designed, not bypassed)

### 10.3 Public V1 (3 months post-beta)

- 1,000+ users
- 25%+ Day-30 retention
- 60%+ of drops get at least one reaction (proves social density)
- Net Promoter Score collected from cohort, target >40

### 10.4 Kill criteria (when to stop)

If after 3 months of public beta:

- Day-30 retention is below 15%, **or**
- Average drops per active user is below 1.0 per day, **or**
- Founders themselves stop using the app daily

→ The mechanic does not work for this audience. Pivot or kill, do not optimize.

---

## 11. Business Model

### 11.1 V1 (free)

Free for everyone. The goal is mechanic validation, not revenue.

### 11.2 V2 ($5/month soft paywall)

Public profile pages are V1 (free, default) — no longer behind a paywall. Pro tier instead bundles cap-raising and power-user features.

- Free: up to 8 accepted friends, full drop functionality, public profile page, all three visibility tiers
- Pro ($5/mo): up to 30 accepted friends, advanced stats, AI-powered weekly review, custom tag colors, priority support

### 11.3 Why not ads

- Authenticity-driven app, ads would destroy trust
- Audience is too small / niche for meaningful ad revenue at this stage
- Subscription aligns incentives — paying users are committed users

### 11.4 Why not freemium-with-limits

Users hate per-feature paywalls in social apps. The only reasonable gating is the friend cap, because that scales with cost (more friends = more storage, more notifications).

### 11.5 Costs at scale (estimated)

```
1,000 active users:
  Convex Pro: $25/mo
  Clerk: $25/mo (just over free tier)
  Anthropic API: ~$30/mo
  Cloudflare R2 (storage): ~$10/mo
  Vercel: $20/mo
  Total: ~$110/mo

10,000 active users:
  Convex: ~$200/mo (usage-based)
  Clerk: ~$100/mo
  Anthropic: ~$200/mo
  R2: ~$80/mo
  Vercel: ~$50/mo
  Total: ~$630/mo

Break-even at ~125 paying users (at $5/mo) for 10k MAU.
```

---

## 12. Open Questions

Things still uncertain, listed honestly:

1. **Will indie builders actually use a separate app instead of just X?** The behavior already happens on X. Why switch? The bet: authenticated proof + small circle + lock mechanic is enough wedge. Unknown until tested.

2. **Is photo proof too much friction for code/knowledge work?** A coder shipping a function does not have a visually interesting moment. Will users default to mirror-selfies-with-laptop, which is fake? Mitigation: voice memo as alternative-proof, screen-capture proof in V2.

3. **Does the 60-second drop window feel like fun pressure or frustrating constraint?** Probably depends on user temperament. Plan to A/B test 60s vs 5min vs no-window in beta.

4. **Will the reciprocity-lock annoy users into churning, or will it create the FOMO loop we want?** This is the #1 product question. BeReal proved it works in entertainment. Unknown if it works in productivity context.

5. **Can dual-camera be implemented in Expo with the polish BeReal has?** Native Swift app might be needed if Expo SDK proves limiting. Plan B exists: single-camera fallback for V1, dual-cam only on supported devices.

---

## 13. The Founder

**Keanu** — currently in IT-Berufsausbildung (Frankfurt am Main), founder of Agent Vault with Melwin, deep generalist across Rust, EVM, ZK, Lightning. Building in public on X. Lives the user-persona problem firsthand: posts daily about projects on X, has shipped some, has let others die quietly. commit is the tool he wishes existed.

**Why this matters:** founder-product fit is unusually strong here. The cold-start cluster is reachable through existing relationships. The build-in-public ethos is authentic, not performative.

---

## 14. The Bet

The core thesis of commit, in one paragraph:

> Productivity apps treat productivity as a logistics problem. It is not. It is a social and psychological problem. The people who consistently produce the work they want to produce are the people who have a visible, accountable circle of doers around them. Most knowledge workers do not. **commit creates that circle, and uses authenticated daily proof to keep it honest.** If that thesis is right, the app retains. If it is wrong, no amount of feature work saves it.

Build the mechanic. Test the thesis. Ship in 6 weeks.

---

_End of document._
