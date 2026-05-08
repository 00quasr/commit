# Phase 3 — The drop flow + habits

**Status**: 🚧 In progress (Phase 2.5 habits pivot just landed)
**Estimated days**: 13–19
**Depends on**: Phase 2 done + Phase 2.5 habits pivot done (commits `04aa1d9`, `97cba98`)
**Goal**: A user can manage habits, drop on a due habit end-to-end on a real iPhone — habit due → camera → caption → submit → friend sees it (subject to reciprocity-lock). Profile shows GitHub-contribution-style heatmap.

Maps to VISION.md §8 Phase 3, with the Phase 2.5 pivot applied: `habits` (recurring definitions with cycles) replace daily `todos`. Single-cam V1 in Expo Go (dual-cam deferred to Phase 5).

## Subtasks

1. Tabs layout — Today / Feed / Profile (3 bottom tabs, dark themed)
2. Today screen — list of habits **due today** via `habits.dueToday` query, "+ habit" sheet (text + difficulty + cycleDays), mark-done CTA opens drop composer
3. Drop composer (text-only first) — modal stack with 60-second countdown screen, caption + tags + visibility, calls `drops.create` with `habitId`. Validates the entire reciprocity-lock loop before native modules
4. Camera screen with `expo-camera` (back-only V1; dual-cam Phase 5)
5. Voice memo recorder with `expo-av` — 30-second hard cap, optional
6. Convex File Storage upload pipeline — `drops.generateUploadUrl` action; client uploads then calls `drops.create` with `photoFileId` / `voiceFileId`
7. Caption + tag picker UI — 100-char limit; chip selector for fixed set + custom input. Claude auto-suggest deferred to Phase 4
8. Feed screen with reciprocity-lock UI: locked → blurred count CTA; unlocked → friends' drop list (newest first), reactions, view tracking
9. Profile screen — header (avatar, username, streak, level, XP), GitHub-style heatmap of last 365 days, recent drops list, sign out
10. New backend queries: `drops.heatmapForProfile`, `drops.recentForProfile`

## End state

The full habit→drop loop works on a real iPhone. A user can:

- Add habits with custom cycles (daily, every 2 days, weekly, etc.)
- See only the habits due today on the Today screen
- Mark a habit done within its 60-second drop window
- Take a photo, attach a caption + tags, submit
- See accepted friends' drops in a reciprocity-locked feed
- View their own profile with a heatmap showing every drop they've shipped

Two-device test: A drops on a habit, B sees A's drop in their feed only after B has also dropped. Camera works on real hardware.
