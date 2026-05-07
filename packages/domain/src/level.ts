/**
 * Level from total XP per VISION §5.4: `level = floor(sqrt(totalXp / 50))`.
 * Early levels come fast, later ones are prestige markers.
 *
 *   0 XP → 0
 *   50 XP → 1
 *   200 XP → 2
 *   5_000 XP → 10
 */
export function levelFromXP(totalXp: number): number {
  if (totalXp < 0) {
    throw new Error(`totalXp must be >= 0, got ${totalXp}`);
  }
  return Math.floor(Math.sqrt(totalXp / 50));
}
