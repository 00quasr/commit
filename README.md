# commit

Daily-feed app for indie builders. See [VISION.md](./VISION.md) for the full pitch and roadmap.

This repo currently contains the **Phase 1 foundation**: monorepo, mobile app shell, web landing, Convex backend, all wired with Clerk auth. No drops, todos, friendships, camera, or push yet — those land in Phase 2+.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Mobile** (`apps/mobile`): Expo SDK 54, expo-router v4, React Native 0.76
- **Web** (`apps/web`): Next.js 15, Tailwind v4, App Router (marketing landing only)
- **Backend** (`packages/convex`): Convex (queries, mutations, schema)
- **Auth**: Clerk (Google OAuth + email magic link). Apple Sign-In is deferred until the $99/yr Apple Developer Program is purchased — adding it later is a Clerk dashboard change, no code changes here.

## Prerequisites

- Node 20+ (`.nvmrc` pins it)
- pnpm 10 (`corepack enable && corepack prepare pnpm@latest --activate`)
- A Clerk account with the **Convex integration** activated (Integrations → Convex → Activate)
- An iPhone with Expo Go installed

## First-time setup

```bash
# 1. Install
pnpm install

# 2. Log in to Convex (free, no credit card)
cd packages/convex
npx convex login
# A browser opens — sign in with GitHub or Google.
#
# IMPORTANT: do NOT pick "Start without an account" when running `convex dev`.
# That creates an anonymous LOCAL deployment at 127.0.0.1:3210, which:
#   - your iPhone in Expo Go cannot reach (different device, different network)
#   - has no working cloud dashboard URL (the printed link 404s)

# 3. Initialize Convex (interactive — creates a cloud project on your account)
npx convex dev
# When prompted, pick "Create a new project" and give it a name (e.g. "commit").
# This creates packages/convex/.env.local with CONVEX_DEPLOYMENT, overwrites
# the stub _generated/ files with real ones, and prints the cloud deployment URL
# (https://….convex.cloud) — that URL is what your mobile .env needs.
# Leave this terminal running.

# 4. Set the Clerk JWT issuer on the Convex deployment (in a NEW terminal)
cd packages/convex
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-frontend-api>.clerk.accounts.dev
# Get the URL from Clerk dashboard → Configure → JWT Templates → "convex" → Issuer field.
# (The "convex" template is auto-created when you activate the Convex integration in Clerk.)

# 5. Configure mobile env
cd ../../apps/mobile
cp .env.example .env
# Edit .env:
#   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...    (from Clerk dashboard)
#   EXPO_PUBLIC_CONVEX_URL=https://...convex.cloud   (printed by `convex dev` in step 3)
```

## Day-to-day dev

You need **two terminals** running in parallel:

```bash
# Terminal A — Convex dev server (also regenerates _generated on schema changes)
cd packages/convex && pnpm dev

# Terminal B — Mobile (Expo)
pnpm --filter @commit/mobile dev
# Scan the QR with the Camera app on iPhone → opens in Expo Go.
```

Optionally, a third terminal for the web landing:

```bash
pnpm --filter @commit/web dev
# http://localhost:3000
```

> Why two terminals: `convex dev` watches `packages/convex/convex/` and rewrites `_generated/` on every schema change. Running it inside `turbo dev` causes a race where mobile typechecks before generated types exist.

## Verification (the "bulletproof" check)

Once setup is done, all of these must succeed:

```bash
pnpm install --frozen-lockfile      # No peer-dep warnings
pnpm typecheck                      # All packages green
pnpm lint                           # Zero errors
pnpm test                           # Vitest stub passes
pnpm --filter @commit/web dev       # localhost:3000 renders landing on #050505
pnpm --filter @commit/mobile dev    # iPhone via Expo Go → sign in → "Hello, name"
```

When all six pass, the foundation is wired correctly. Convex dashboard → Data → `profiles` should show one row per signed-in user.

## Project structure

```
apps/
├── mobile/      Expo + expo-router (the actual product)
└── web/         Next.js 15 marketing landing (one page, no auth)

packages/
├── convex/      Schema + queries + mutations (profiles only for Phase 1)
├── domain/      Pure-TS business logic (stub for Phase 1; Phase 2 adds XP, streaks, reciprocity-lock)
├── ui-tokens/   Shared design tokens (colors, fonts) used by mobile and web
└── config/
    ├── eslint/    @commit/eslint-config (flat config, base + expo + next)
    ├── prettier/  @commit/prettier-config
    └── tsconfig/  @commit/tsconfig (strict base + per-target configs)
```

## Phase 2 hooks

When you start Phase 2 (drops + friendships):

1. Add tables to `packages/convex/convex/schema.ts` (drops, friendships, reactions, views, userStats, activityEvents).
2. Add domain logic in `packages/domain/src/` (XP calc, streak rules, reciprocity-lock check) with Vitest tests.
3. Add screens in `apps/mobile/app/(app)/`.

Foundation does not need to change.

## License

See [LICENSE](./LICENSE).
