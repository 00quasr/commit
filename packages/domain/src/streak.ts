/**
 * Streak rules per VISION §5.3:
 *   - First-ever drop: streak = 1.
 *   - Same day as last drop: no change.
 *   - Day immediately after last drop: streak += 1.
 *   - Gap of one or more days, with grace card available: consume the card,
 *     streak += 1 (one missed day forgiven).
 *   - Gap of one or more days, no grace card: streak resets to 1.
 *
 * Gap arithmetic uses the calendar-day distance between two "YYYY-MM-DD"
 * strings, computed via UTC midnight (the strings are already timezone-
 * normalized via `dayKeyInTimezone`, so UTC math here is correct).
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

function dayKeyDistance(a: string, b: string): number {
  const aMs = Date.UTC(...parseDayKey(a));
  const bMs = Date.UTC(...parseDayKey(b));
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24));
}

function parseDayKey(key: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    throw new Error(`Invalid dayKey: ${key}`);
  }
  return [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
}
