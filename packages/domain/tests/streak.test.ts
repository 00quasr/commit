import { describe, expect, it } from "vitest";
import { streakAfterDrop } from "../src/streak";

describe("streakAfterDrop", () => {
  it("first-ever drop starts streak at 1", () => {
    expect(
      streakAfterDrop({
        previousStreak: 0,
        lastDropDayKey: undefined,
        newDropDayKey: "2026-05-07",
        graceCardsAvailable: 0,
      }),
    ).toEqual({ newStreak: 1, consumeGraceCard: false, brokenAndReset: false });
  });

  it("same-day drop does not change streak", () => {
    expect(
      streakAfterDrop({
        previousStreak: 5,
        lastDropDayKey: "2026-05-07",
        newDropDayKey: "2026-05-07",
        graceCardsAvailable: 0,
      }),
    ).toEqual({ newStreak: 5, consumeGraceCard: false, brokenAndReset: false });
  });

  it("consecutive day extends streak", () => {
    expect(
      streakAfterDrop({
        previousStreak: 5,
        lastDropDayKey: "2026-05-06",
        newDropDayKey: "2026-05-07",
        graceCardsAvailable: 0,
      }),
    ).toEqual({ newStreak: 6, consumeGraceCard: false, brokenAndReset: false });
  });

  it("gap day with grace card available consumes card and extends", () => {
    expect(
      streakAfterDrop({
        previousStreak: 10,
        lastDropDayKey: "2026-05-05",
        newDropDayKey: "2026-05-07",
        graceCardsAvailable: 1,
      }),
    ).toEqual({ newStreak: 11, consumeGraceCard: true, brokenAndReset: false });
  });

  it("gap day with no grace card resets streak to 1", () => {
    expect(
      streakAfterDrop({
        previousStreak: 10,
        lastDropDayKey: "2026-05-05",
        newDropDayKey: "2026-05-07",
        graceCardsAvailable: 0,
      }),
    ).toEqual({ newStreak: 1, consumeGraceCard: false, brokenAndReset: true });
  });

  it("multi-day gap with grace card still only consumes one card", () => {
    expect(
      streakAfterDrop({
        previousStreak: 10,
        lastDropDayKey: "2026-04-01",
        newDropDayKey: "2026-05-07",
        graceCardsAvailable: 1,
      }),
    ).toEqual({ newStreak: 11, consumeGraceCard: true, brokenAndReset: false });
  });

  it("rejects newDropDayKey before lastDropDayKey", () => {
    expect(() =>
      streakAfterDrop({
        previousStreak: 5,
        lastDropDayKey: "2026-05-08",
        newDropDayKey: "2026-05-07",
        graceCardsAvailable: 0,
      }),
    ).toThrow();
  });

  it("rejects malformed dayKey", () => {
    expect(() =>
      streakAfterDrop({
        previousStreak: 1,
        lastDropDayKey: "not-a-date",
        newDropDayKey: "2026-05-07",
        graceCardsAvailable: 0,
      }),
    ).toThrow();
  });
});
