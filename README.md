# commit

> Habit tracker with BeReal-style proof.  
> Set a goal, prove you did it, see what your circle shipped today.

A daily-feed iOS app where every entry is a **drop** — a 60-second photo + voice proof that you did the habit you committed to. Drops appear in a reciprocity-locked feed: no proof today, no feed access. Your profile shows a GitHub-contribution-style heatmap of every drop you've shipped.

**Status — Phase 3 shipped.** The full loop runs end-to-end on iPhone: sign in, add a habit with a cycle (daily / every-2-days / weekly), drop on it, see your circle's drops, view your heatmap. Phase 4 is friends invites + push notifications + onboarding.

## Stack

|             |                                                            |
| ----------- | ---------------------------------------------------------- |
| **Mobile**  | Expo SDK 54 · React Native 0.81 · expo-router v6           |
| **Backend** | Convex (realtime queries, mutations, file storage)         |
| **Auth**    | Clerk (Google OAuth + email magic-link)                    |
| **Web**     | Next.js 15 · Tailwind v4 (marketing landing)               |
| **Shared**  | TypeScript strict · `@commit/domain` · `@commit/ui-tokens` |
| **Tooling** | pnpm 10 workspaces · Turborepo 2 · Vitest · convex-test    |

## Quick start

```bash
pnpm install

# in one terminal — Convex backend (creates the cloud project on first run)
cd packages/convex && pnpm dev

# in another — iPhone via Expo Go
pnpm --filter @commit/mobile dev
```

You'll need a [Clerk](https://dashboard.clerk.com) app with the Convex integration activated, and `apps/mobile/.env` filled with `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` + `EXPO_PUBLIC_CONVEX_URL`. Full setup steps in [docs/phase-1-foundation.md](./docs/phase-1-foundation.md).

## Project layout

```
apps/
  mobile/    Expo + expo-router  (Today / Feed / Profile + drop modal)
  web/       Next.js marketing landing + waitlist
packages/
  convex/    Schema + queries + mutations  (115 tests in CI)
  domain/    Pure-TS rules — XP, streaks, day-keys, due-today, lock
  ui-tokens/ colors · fonts · semantic
  config/    eslint · prettier · tsconfig
docs/        Phase roadmap (Phase 0 → 6)
```

## Verify

```bash
pnpm typecheck    # 6/6
pnpm lint         # 5/5
pnpm test         # 115 tests
```

—

[VISION](./VISION.md) · [Roadmap](./docs/) · [LICENSE](./LICENSE)
