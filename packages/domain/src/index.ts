export const PHASE = "core-data" as const;

export type Phase = typeof PHASE;

export { dayKeyDistance, dayKeyInTimezone } from "./day-key";
export { type Difficulty, XP_BY_DIFFICULTY, calculateXP, streakMultiplier } from "./xp";
export { levelFromXP } from "./level";
export { type StreakInput, type StreakOutput, streakAfterDrop } from "./streak";
export { canonicalPair } from "./friendship";
export { type ReciprocityInput, shouldLockFeed } from "./reciprocity";
export { type IsDueTodayInput, isDueToday } from "./due";
