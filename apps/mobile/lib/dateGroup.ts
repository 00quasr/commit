import { dayKeyDistance } from "@commit/domain";

export type DateBucket = "today" | "yesterday" | "thisWeek" | "earlier";

export interface GroupedSection<T> {
  bucket: DateBucket;
  title: string;
  data: T[];
}

const BUCKETS: Array<{ bucket: DateBucket; title: string; min: number; max: number }> = [
  { bucket: "today", title: "Today", min: 0, max: 0 },
  { bucket: "yesterday", title: "Yesterday", min: 1, max: 1 },
  { bucket: "thisWeek", title: "This week", min: 2, max: 7 },
  { bucket: "earlier", title: "Earlier", min: 8, max: Number.POSITIVE_INFINITY },
];

/**
 * Buckets items by relative date (today / yesterday / this week / earlier)
 * compared against `todayDayKey`. Items more than 7 days old fall into
 * "earlier"; items in the future are bucketed as "today" (sane default).
 *
 * Returns sections in chronological order (today → earlier), skipping
 * empty buckets.
 */
export function groupByRelativeDate<T>(
  items: T[],
  getDayKey: (item: T) => string,
  todayDayKey: string,
): Array<GroupedSection<T>> {
  const filled = BUCKETS.map((b) => ({ ...b, data: [] as T[] }));
  for (const item of items) {
    const dist = Math.max(0, dayKeyDistance(getDayKey(item), todayDayKey));
    for (const b of filled) {
      if (dist >= b.min && dist <= b.max) {
        b.data.push(item);
        break;
      }
    }
  }
  return filled
    .filter((b) => b.data.length > 0)
    .map(({ bucket, title, data }) => ({ bucket, title, data }));
}
