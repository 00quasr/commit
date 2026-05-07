export type Difficulty = "easy" | "medium" | "hard";

export const XP_BY_DIFFICULTY: Readonly<Record<Difficulty, number>> = {
  easy: 30,
  medium: 60,
  hard: 120,
};

/**
 * Streak multiplier per VISION §5.4: 1.0x at streak < 7, ramping linearly
 * to 2.0x at streak >= 30. Clamped at both ends.
 */
export function streakMultiplier(streak: number): number {
  if (streak < 7) return 1.0;
  if (streak >= 30) return 2.0;
  // Linear ramp from (7, 1.0) to (30, 2.0): slope = 1/23.
  return 1.0 + (streak - 7) / 23;
}

export function calculateXP(difficulty: Difficulty, streak: number): number {
  return Math.round(XP_BY_DIFFICULTY[difficulty] * streakMultiplier(streak));
}
