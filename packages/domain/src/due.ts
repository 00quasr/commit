import { dayKeyDistance, dayKeyWeekday } from "./day-key";

/**
 * Whether a habit is "due today" given its cycle.
 *
 * Rules (standard cycle):
 *   - cycleDays must be >= 1 (1 = daily, 2 = every other day, 7 = weekly).
 *   - Habit not yet active (createdDayKey is in the future): not due.
 *   - Never dropped on this habit AND today >= createdDayKey: due.
 *   - Already dropped TODAY on this habit: not due (would be a redundant prompt).
 *   - Otherwise: due if (today - lastDropDayKey) >= cycleDays calendar days.
 *
 * Rules (custom weekday cycle — customDays is set):
 *   - Due only when today's weekday is one of the selected days (0=Sun … 6=Sat).
 *   - Not due if the habit was already dropped today.
 *   - Not due if the habit hasn't started yet.
 *
 * Missed cycles do NOT shift the schedule. A habit stays "due" once it has
 * passed its window until the user either drops on it or archives it.
 */

export interface IsDueTodayInput {
  cycleDays: number;
  /** When set, the habit uses weekday-based scheduling instead of cycleDays. */
  customDays?: number[];
  habitCreatedDayKey: string;
  lastDropDayKey: string | undefined;
  todayDayKey: string;
}

export function isDueToday(input: IsDueTodayInput): boolean {
  const { cycleDays, customDays, habitCreatedDayKey, lastDropDayKey, todayDayKey } = input;

  if (customDays && customDays.length > 0) {
    if (dayKeyDistance(habitCreatedDayKey, todayDayKey) < 0) return false;
    if (lastDropDayKey === todayDayKey) return false;
    return customDays.includes(dayKeyWeekday(todayDayKey));
  }

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
