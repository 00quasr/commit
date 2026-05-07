import { describe, expect, it } from "vitest";
import { XP_BY_DIFFICULTY, calculateXP, streakMultiplier } from "../src/xp";

describe("streakMultiplier", () => {
  it("is 1.0 below 7-day streak", () => {
    expect(streakMultiplier(0)).toBe(1.0);
    expect(streakMultiplier(6)).toBe(1.0);
  });

  it("ramps linearly from 7 to 30", () => {
    expect(streakMultiplier(7)).toBeCloseTo(1.0, 5);
    expect(streakMultiplier(18)).toBeCloseTo(1.0 + 11 / 23, 5);
    expect(streakMultiplier(29)).toBeCloseTo(1.0 + 22 / 23, 5);
  });

  it("caps at 2.0 from 30 onward", () => {
    expect(streakMultiplier(30)).toBe(2.0);
    expect(streakMultiplier(100)).toBe(2.0);
  });
});

describe("calculateXP", () => {
  it("returns base XP at streak 0", () => {
    expect(calculateXP("easy", 0)).toBe(XP_BY_DIFFICULTY.easy);
    expect(calculateXP("medium", 0)).toBe(XP_BY_DIFFICULTY.medium);
    expect(calculateXP("hard", 0)).toBe(XP_BY_DIFFICULTY.hard);
  });

  it("doubles base XP at streak 30+", () => {
    expect(calculateXP("easy", 30)).toBe(60);
    expect(calculateXP("medium", 30)).toBe(120);
    expect(calculateXP("hard", 30)).toBe(240);
    expect(calculateXP("hard", 100)).toBe(240);
  });

  it("rounds to integer", () => {
    // streak 18 → multiplier ~1.4783; medium → 60 * 1.4783 = 88.7 → 89
    expect(calculateXP("medium", 18)).toBe(89);
  });
});
