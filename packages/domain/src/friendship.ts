/**
 * Sorts a pair of profile IDs into canonical (low, high) order so each
 * friendship has exactly one row in the `friendships` table.
 *
 * Convex Ids are opaque base32 strings; lexicographic comparison gives a
 * stable total order, which is all we need for canonicalization.
 */
export function canonicalPair<T extends string>(a: T, b: T): { low: T; high: T } {
  if (a === b) {
    throw new Error("Cannot create a friendship pair with self");
  }
  return a < b ? { low: a, high: b } : { low: b, high: a };
}
