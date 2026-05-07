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
