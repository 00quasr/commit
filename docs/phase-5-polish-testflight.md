# Phase 5 — Polish & TestFlight

**Status**: ⏳ Planned
**Estimated days**: 27–33
**Depends on**: Phase 4 done
**Goal**: Production-grade polish, edge cases handled, and the app distributed via TestFlight to 5–10 personal beta testers.

Maps to VISION.md §8 Phase 5. **Apple Developer Program ($99/yr) becomes required at this phase.**

## Subtasks

1. Optimistic UI for drops, reactions, and friendship-accept (snappy interactions even on slow networks)
2. Image caching with `expo-image`
3. Feed pagination — cursor-based, lazy loading older days as the user scrolls
4. Edge cases handled: empty no-friends state, camera permission denied, connection-loss retries, missed 60-second drop window, paused/backgrounded recording
5. Settings + profile screen — account, timezone, sign-out
6. GDPR-compliant delete-account flow — Convex purge of user data + Clerk account deletion
7. Marketing landing v2 in `apps/web` — screenshots, copy, waitlist signup form (Resend integration for confirmations)
8. Apple Developer Program purchase ($99/yr) + iOS dev build via EAS Build (registered devices)
9. EAS Build → TestFlight Internal Testing distribution
10. Sentry + PostHog wired up for crash tracking and product analytics

## End state

5–10 personal beta testers (the "Lock-In Five" from VISION §9.1 plus a handful more) are using `commit` on TestFlight. Crashes are <1%, edge cases don't surface in normal use, and there's enough analytics in place to measure retention before public beta.
