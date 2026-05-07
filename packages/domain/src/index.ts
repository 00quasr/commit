// Phase 2 will add: calculateXp, calculateLevel, hasDroppedToday,
// streakAtMidnight, reciprocityLockCheck, etc.
// For Phase 1 this package is intentionally empty — the wiring matters,
// not the contents.

export const PHASE = "foundation" as const;

export type Phase = typeof PHASE;
