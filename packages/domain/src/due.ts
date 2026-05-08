import { dayKeyDistance } from "./day-key";

/**
 * Whether a habit is "due today" given its cycle.
 *
 * Rules:
 *   - cycleDays must be >= 1 (1 = daily, 2 = every other day, 7 = weekly).
 *   - Habit not yet active (createdDayKey is in the future): not due.
 *   - Never dropped on this habit AND today >= createdDayKey: due.
 *   - Already dropped TODAY on this habit: not due (would be a redundant prompt).
 *   - Otherwise: due if (today - lastDropDayKey) >= cycleDays calendar days.
 *
 * Missed cycles do NOT shift the schedule. A habit stays "due" once it has
 * passed its window until the user either drops on it or archives it.
 */

export interface IsDueTodayInput {
  cycleDays: number;
  habitCreatedDayKey: string;
  lastDropDayKey: string | undefined;
  todayDayKey: string;
}

export function isDueToday(input: IsDueTodayInput): boolean {
  const { cycleDays, habitCreatedDayKey, lastDropDayKey, todayDayKey } = input;
  if (cycleDays < 1) {
    throw new Error(`cycleDays must be >= 1, got ${cycleDays}`);
  }

  if (dayKeyDistance(habitCreatedDayKey, todayDayKey) < 0) {
    return false;
  }

  if (lastDropDayKey === undefined) {
    return true;
  }

  if (lastDropDayKey === todayDayKey) {
    return false;
  }

  return dayKeyDistance(lastDropDayKey, todayDayKey) >= cycleDays;
}
