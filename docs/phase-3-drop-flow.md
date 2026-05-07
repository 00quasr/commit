# Phase 3 — The drop flow

**Status**: ⏳ Planned
**Estimated days**: 13–19
**Depends on**: Phase 2 done
**Goal**: A user can create a drop end-to-end on a real iPhone — todo done → camera → caption → submit → friend sees it (subject to reciprocity-lock).

Maps to VISION.md §8 Phase 3. This is the product week.

## Subtasks

1. Camera screen with `expo-camera`: dual-cam (front+back simultaneous) where supported; single-camera fallback otherwise
2. Voice memo recorder with `expo-av` — 30-second hard cap with countdown
3. Caption + tag picker UI — 100-char limit; auto-suggest tags via a Claude Convex action (`@build`, `@health`, `@create`, custom)
4. Upload pipeline: photo + voice memo → Convex File Storage, returning fileIds; mutation persists the drop with those fileIds
5. Feed screen with reciprocity-lock UI: today's drops are blurred until the user has dropped today; yesterday and earlier always visible
6. Drop creation flow: todo marked done → 60-second countdown overlay → camera → caption → submit; missing the window marks the todo done locally but does NOT create a drop
7. Today screen: list of today's todos, mark-done action, optional Claude breakdown of a hard todo into subtasks

## End state

The full drop loop works on a real iPhone. Two devices can be tested side-by-side: A drops, B sees A's drop in their feed only after B has also dropped. Camera works on real hardware (not simulator-only).
