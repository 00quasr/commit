# commit — mobile

The Expo + React Native client for **commit**, a habit tracker with BeReal-style proof. Every entry is a _drop_ — a photo proof that you did the habit you committed to — surfaced in a reciprocity-locked feed.

See the [root README](../../README.md) for the product pitch and the full monorepo. This README covers the mobile app specifically: how it's wired, its env vars, and the iOS dev loop.

> iOS-first · dark-mode only · New Architecture (Fabric) enabled.

## Tech stack

- **Expo SDK** `~54.0.34` · **React Native** `0.81.5` · **React** `19.1.0`
- **expo-router** `~6` — file-based routing with typed routes
- **Convex** `^1.17` — realtime backend (queries, mutations, file storage)
- **Clerk** `@clerk/clerk-expo ^2.4` — Google OAuth + passwordless email
- **Reanimated** `~4.1` — UI-thread animations · **Gesture Handler** `~2.28`
- **Zustand** `^5` — local draft state only

Styling is React Native `StyleSheet` + semantic tokens from `@commit/ui-tokens` (no NativeWind/Tailwind in the mobile app).

## Prerequisites

- **Node** `>=20.11` (`.nvmrc` pins `20`) and **pnpm** `10.26.2`
- **Xcode** + iOS Simulator (macOS) for native builds
- Run `pnpm install` **from the repo root** — this is a pnpm workspace, not a standalone package.

## Environment variables

Copy `.env.example` → `.env` and fill in both values. They're `EXPO_PUBLIC_*`-prefixed, so they're embedded in the bundle (public config, not secrets). The app throws at startup if either is missing (`app/_layout.tsx`).

| Variable                            | Description           | Example                  |
| ----------------------------------- | --------------------- | ------------------------ |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_…`              |
| `EXPO_PUBLIC_CONVEX_URL`            | Convex deployment URL | `https://….convex.cloud` |

You'll need a [Clerk](https://dashboard.clerk.com) app with the Convex integration activated.

## Running locally

Two terminals — the Convex backend must be running whenever you touch backend functions, or the client keeps reading stale function signatures.

```bash
# terminal 1 — backend (creates the cloud project on first run)
cd packages/convex && pnpm dev

# terminal 2 — Metro bundler (iOS, port 8081)
cd apps/mobile && pnpm dev
```

### Scripts

| Script           | What it does                        |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | `expo start --port 8081`            |
| `pnpm start`     | `expo start --port 8081`            |
| `pnpm ios`       | `expo run:ios` — native build + run |
| `pnpm android`   | `expo run:android`                  |
| `pnpm web`       | `expo start --web`                  |
| `pnpm lint`      | `eslint .`                          |
| `pnpm typecheck` | `tsc --noEmit`                      |

### First run vs. hot reload

The first time, run `expo run:ios` once — it builds the native app and installs it on the simulator. After that, `pnpm dev` (Metro) hot-reloads JS into the already-installed app; you don't need to rebuild for JS-only changes.

- **Ports:** iOS → `8081`, Android → `8082` (kept fixed so both can run in parallel).
- **Native/config changes** (anything under `ios/`, `app.json` plugins, new native deps) require a fresh `expo run:ios`.
- `ios/` is committed prebuild output.

For the worktree-based testing workflow (running Metro from a worktree against the installed app), see [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md).

## Project structure

### Routing (`app/`, Expo Router)

```text
app/
  _layout.tsx                 Root layout — providers (Gesture → Clerk → Convex)
  index.tsx                   Splash → redirects to (auth) or (app)
  (auth)/
    _layout.tsx               Redirects to (app) when already signed in
    sign-in.tsx               Email-code + Google OAuth
  (app)/                      Protected — requires Clerk session + Convex profile
    _layout.tsx               Profile gate + first-run username picker
    (tabs)/
      _layout.tsx             Bottom tabs (Today / Feed)
      index.tsx               Today — habits, heatmap, stats
      feed.tsx                Feed — reciprocity-locked activity stream
    profile.tsx               Profile modal
    memories.tsx              Photo memories grid
    friends.tsx               Friend requests & list
    archived-habits.tsx       Archived habits
    settings/
      _layout.tsx
      index.tsx
      delete-account.tsx
    drop/                     Drop creation flow
      _layout.tsx
      camera.tsx              Photo capture
      compose.tsx             Caption + visibility
    day/[dayKey].tsx          Day detail (all drops for a date)
    habit/drops/[id].tsx      A habit's drop history
    u/[username].tsx          Public user profile
```

### Supporting directories

- **`components/`** — `DropCard`, `Heatmap` / `MiniHeatmap` / `FeedMiniHeatmap`, `BottomBar`, `HabitRow`, `AvatarCropModal`, `ChooseUsername`, `ActivityEventCard`, `MemoriesGrid`, `ProfileDropRow`, `icons`.
- **`lib/`** — `dropDraft.ts` (Zustand draft store), `theme.ts`, `dateGroup.ts`, `timezones.ts`, `account-deletion.ts`, `constants.ts`.
- **`ios/`** — committed Expo prebuild output (Xcode project, Podfile).

## Architecture notes

- **Providers** (`app/_layout.tsx`, outer → inner): `GestureHandlerRootView` → `ClerkProvider` → `ConvexProviderWithClerk`. Clerk's `useAuth` is handed to Convex so auth tokens inject automatically into every query/mutation.
- **Auth gating:** the splash (`app/index.tsx`) redirects on Clerk's `isSignedIn`. Inside `(app)/_layout.tsx`, the `api.profiles.me` query decides the rest — `null` shows the `ChooseUsername` first-run modal, `undefined` shows a loader, and a 6-second timeout falls back to `signOut()`.
- **State:** Convex owns all server data via realtime queries/mutations. Zustand (`lib/dropDraft.ts`) holds only the in-flight drop draft.
- **Backend types** come from the workspace package:
  ```ts
  import { api } from "@commit/convex/api";
  import type { Id } from "@commit/convex/dataModel";
  ```
  The schema (`profiles`, `habits`, `drops`, `friendships`, `reactions`, `views`, `userStats`, `activityEvents`, `waitlist`) lives in [`packages/convex`](../../packages/convex).
- **Animations** run as Reanimated worklets on the UI thread throughout.

## Verify

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint .
```

The backend test suite (convex-test) lives in `packages/convex` — run `pnpm test` from the repo root.
