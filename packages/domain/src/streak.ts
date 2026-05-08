import { dayKeyDistance } from "./day-key";

/**
 * Streak rules per VISION §5.3:
 *   - First-ever drop: streak = 1.
 *   - Same day as last drop: no change.
 *   - Day immediately after last drop: streak += 1.
 *   - Gap of one or more days, with grace card available: consume the card,
 *     streak += 1 (one missed day forgiven).
 *   - Gap of one or more days, no grace card: streak resets to 1.
 *
 * Streak is GLOBAL — one streak per user across all drops, regardless of
 * which habit a drop was on. Per VISION §5.3 (post habit-pivot retained
 * for simplicity).
 */

export interface StreakInput {
  previousStreak: number;
  lastDropDayKey: string | undefined;
  newDropDayKey: string;
  graceCardsAvailable: number;
}

export interface StreakOutput {
  newStreak: number;
  consumeGraceCard: boolean;
  brokenAndReset: boolean;
}

export function streakAfterDrop(input: StreakInput): StreakOutput {
  const { previousStreak, lastDropDayKey, newDropDayKey, graceCardsAvailable } = input;

  if (lastDropDayKey === undefined) {
    return { newStreak: 1, consumeGraceCard: false, brokenAndReset: false };
  }

  const gap = dayKeyDistance(lastDropDayKey, newDropDayKey);
  if (gap < 0) {
    throw new Error(`newDropDayKey ${newDropDayKey} is before lastDropDayKey ${lastDropDayKey}`);
  }

  if (gap === 0) {
    return { newStreak: previousStreak, consumeGraceCard: false, brokenAndReset: false };
  }

  if (gap === 1) {
    return {
      newStreak: previousStreak + 1,
      consumeGraceCard: false,
      brokenAndReset: false,
    };
  }

  // gap >= 2: at least one day missed.
  if (graceCardsAvailable > 0) {
    return {
      newStreak: previousStreak + 1,
      consumeGraceCard: true,
      brokenAndReset: false,
    };
  }

  return { newStreak: 1, consumeGraceCard: false, brokenAndReset: true };
}
