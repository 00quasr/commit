/**
 * Returns "YYYY-MM-DD" for the given timestamp in the given IANA timezone.
 * Used as the canonical day boundary for streaks and the reciprocity-lock.
 *
 * `Intl.DateTimeFormat` is the right tool here — it correctly handles DST
 * transitions in both V8 (Convex isolate) and Node (Vitest), unlike manual
 * UTC offset math which silently breaks across spring/fall transitions.
 */
export function dayKeyInTimezone(unixMs: number, ianaTz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(unixMs));

  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Missing ${type} from Intl.DateTimeFormat output`);
    }
    return part.value;
  };

  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Calendar-day distance between two "YYYY-MM-DD" strings.
 * Positive when `b` is after `a`, negative when before, 0 when same day.
 *
 * Uses UTC midnight math — both day-keys are already timezone-normalized
 * via `dayKeyInTimezone`, so subtracting their UTC anchors gives the
 * correct number of calendar days.
 */
export function dayKeyDistance(a: string, b: string): number {
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
