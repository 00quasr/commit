# Phase 1 — Foundation

**Status**: ✅ Done (commit `03da8c8`, 2026-05-07)
**Estimated days**: 3–7
**Depends on**: Phase 0 done
**Goal**: Bulletproof scaffold — strict TypeScript, working auth, type-safe Convex queries, and a dev loop on a real iPhone, with CI gates that prevent regressions.

This doc reflects what was actually shipped, not the original spec.

## Subtasks (as built)

1. Monorepo: pnpm 10 workspaces + Turborepo 2
2. Shared configs: `@commit/tsconfig` (strict, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` in package targets), `@commit/eslint-config` (flat config), `@commit/prettier-config`
3. `apps/mobile`: Expo SDK 54 + expo-router v6 + RN 0.81; Clerk + Convex providers wired; sign-in screen (Google OAuth + email magic-link); auth-gated "Hello, name" screen
4. `apps/web`: Next.js 15 + Tailwind v4; single static landing page on `#050505` with Geist fonts
5. `packages/convex`: schema with `profiles` table only; `profiles.me` query + `profiles.upsert` mutation, both with `returns` validators; cloud dev deployment `original-puffin-311`
6. `packages/domain`: pure-TS stub + Vitest sanity test wired up
7. `packages/ui-tokens`: bg/fg + Geist / Geist Mono font names
8. CI: `.github/workflows/ci.yml` runs `pnpm typecheck && pnpm lint && pnpm test` on every PR
9. Pre-commit: husky + lint-staged formats staged files via Prettier
10. `pnpm patch` on `@expo/metro-runtime@4.0.1` to fix the `getDevServer is not a function` runtime crash on RN 0.81 (file `patches/@expo__metro-runtime@4.0.1.patch`, registered in `pnpm-workspace.yaml`); applies automatically on every install
11. Verified end-to-end on iPhone 16e simulator — both Google OAuth and email magic-link sign-in succeed; "Hello, [username]" round-trips through Clerk session → Convex JWT → realtime `profiles.me` query

## Deferred to later phases (intentionally not in foundation)

- Drops, todos, friendships, reactions, views, userStats, activityEvents (Phase 2)
- Camera, voice memo, feed UI (Phase 3)
- Push notifications, reactions UI, streak/XP UI, onboarding (Phase 4)
- Sentry, PostHog, Resend (Phase 4–5)
- Apple Sign-In, EAS Build, TestFlight (Phase 5)
- Web auth on `apps/web` — web is marketing-only in Phase 1

## End state

A new contributor with the env values can clone the repo, run `pnpm install && npx convex dev`, set `apps/mobile/.env`, and reach "Hello, name" on iPhone within ~15 minutes. Every wire (auth, realtime, mutations, types, lint, tests, CI, deploy) is proven before any feature work begins.
