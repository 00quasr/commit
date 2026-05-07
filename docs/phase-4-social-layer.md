# Phase 4 — Social layer

**Status**: ⏳ Planned
**Estimated days**: 20–26
**Depends on**: Phase 3 done
**Goal**: Reactions, notifications, streaks, onboarding, and invites — everything that turns "an app where you can drop" into "an app a stranger can use without a manual."

Maps to VISION.md §8 Phase 4.

## Subtasks

1. Emoji reactions on drops — V1 fixed set: 🔥 💪 👀 💯 (selfie-video reactions are V2, deferred)
2. Push notifications via Expo Push Service: friend dropped, friend reacted to your drop, friend request received
3. Streak counter UI + grace-card display on profile (rules per VISION §5.3)
4. XP / level display on profile (formula `level = floor(sqrt(total_xp / 50))` per VISION §5.4)
5. Onboarding flow — 3 screens: the pitch, circle setup (request first friends), guided first drop
6. Friend invite via SMS share-link: `commit.app/invite/<code>` deep-links into the app and pre-fills the friend request
7. Tag system applied to drops in feed and profile views (`@build`, `@health`, `@create`, custom)

## End state

A stranger can install Expo Go, scan an invite link, complete onboarding, send their first drop, and react to a friend's drop — without ever asking how anything works.
