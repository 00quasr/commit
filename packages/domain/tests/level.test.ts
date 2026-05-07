import { describe, expect, it } from "vitest";
import { levelFromXP } from "../src/level";

describe("levelFromXP", () => {
  it("starts at 0", () => {
    expect(levelFromXP(0)).toBe(0);
    expect(levelFromXP(49)).toBe(0);
  });

  it("hits level 1 at 50 XP", () => {
    expect(levelFromXP(50)).toBe(1);
    expect(levelFromXP(199)).toBe(1);
  });

  it("hits level 2 at 200 XP", () => {
    expect(levelFromXP(200)).toBe(2);
    expect(levelFromXP(449)).toBe(2);
  });

  it("hits level 10 at 5000 XP", () => {
    expect(levelFromXP(5000)).toBe(10);
    expect(levelFromXP(4999)).toBe(9);
  });

  it("rejects negative XP", () => {
    expect(() => levelFromXP(-1)).toThrow();
  });
});
