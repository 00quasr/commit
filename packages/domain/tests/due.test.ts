import { describe, expect, it } from "vitest";
import { isDueToday } from "../src/due";

describe("isDueToday", () => {
  it("never-dropped habit on its created day is due", () => {
    expect(
      isDueToday({
        cycleDays: 1,
        habitCreatedDayKey: "2026-05-07",
        lastDropDayKey: undefined,
        todayDayKey: "2026-05-07",
      }),
    ).toBe(true);
  });

  it("never-dropped habit before its created day is NOT due", () => {
    expect(
      isDueToday({
        cycleDays: 1,
        habitCreatedDayKey: "2026-05-08",
        lastDropDayKey: undefined,
        todayDayKey: "2026-05-07",
      }),
    ).toBe(false);
  });

  it("dropped today is NOT due (redundant prompt prevention)", () => {
    expect(
      isDueToday({
        cycleDays: 1,
        habitCreatedDayKey: "2026-05-01",
        lastDropDayKey: "2026-05-07",
        todayDayKey: "2026-05-07",
      }),
    ).toBe(false);
  });

  it("daily (cycleDays=1): due the day after last drop", () => {
    expect(
      isDueToday({
        cycleDays: 1,
        habitCreatedDayKey: "2026-05-01",
        lastDropDayKey: "2026-05-06",
        todayDayKey: "2026-05-07",
      }),
    ).toBe(true);
  });

  it("every-2-days: NOT due the day after last drop", () => {
    expect(
      isDueToday({
        cycleDays: 2,
        habitCreatedDayKey: "2026-05-01",
        lastDropDayKey: "2026-05-06",
        todayDayKey: "2026-05-07",
      }),
    ).toBe(false);
  });

  it("every-2-days: due 2 days after last drop", () => {
    expect(
      isDueToday({
        cycleDays: 2,
        habitCreatedDayKey: "2026-05-01",
        lastDropDayKey: "2026-05-05",
        todayDayKey: "2026-05-07",
      }),
    ).toBe(true);
  });

  it("weekly (cycleDays=7): due exactly 7 days after last drop", () => {
    expect(
      isDueToday({
        cycleDays: 7,
        habitCreatedDayKey: "2026-04-01",
        lastDropDayKey: "2026-04-30",
        todayDayKey: "2026-05-07",
      }),
    ).toBe(true);
    expect(
      isDueToday({
        cycleDays: 7,
        habitCreatedDayKey: "2026-04-01",
        lastDropDayKey: "2026-04-30",
        todayDayKey: "2026-05-06",
      }),
    ).toBe(false);
  });

  it("missed-cycle habit stays due (does not shift schedule)", () => {
    // cycleDays=2, lastDrop 10 days ago — still due, hasn't been "skipped"
    expect(
      isDueToday({
        cycleDays: 2,
        habitCreatedDayKey: "2026-04-01",
        lastDropDayKey: "2026-04-27",
        todayDayKey: "2026-05-07",
      }),
    ).toBe(true);
  });

  // Custom weekday cycles (e.g. Wed + Sun only). 2026-06-10 is a Wednesday,
  // 2026-06-14 is a Sunday, 2026-06-11 is a Thursday.
  describe("custom weekday cycle", () => {
    const WED_SUN = [3, 0];

    it("is due on a scheduled weekday", () => {
      expect(
        isDueToday({
          cycleDays: 1,
          customDays: WED_SUN,
          habitCreatedDayKey: "2026-06-01",
          lastDropDayKey: undefined,
          todayDayKey: "2026-06-10", // Wednesday
        }),
      ).toBe(true);
    });

    it("is NOT due on an unscheduled weekday", () => {
      expect(
        isDueToday({
          cycleDays: 1,
          customDays: WED_SUN,
          habitCreatedDayKey: "2026-06-01",
          lastDropDayKey: undefined,
          todayDayKey: "2026-06-11", // Thursday
        }),
      ).toBe(false);
    });

    it("resets and is due again on the next scheduled weekday after a drop", () => {
      // Dropped Wednesday — Thursday is off (not due), and the following Sunday
      // it must be due again (the schedule resets per-weekday, no carry-over).
      expect(
        isDueToday({
          cycleDays: 1,
          customDays: WED_SUN,
          habitCreatedDayKey: "2026-06-01",
          lastDropDayKey: "2026-06-10", // Wednesday
          todayDayKey: "2026-06-11", // Thursday — off day
        }),
      ).toBe(false);
      expect(
        isDueToday({
          cycleDays: 1,
          customDays: WED_SUN,
          habitCreatedDayKey: "2026-06-01",
          lastDropDayKey: "2026-06-10", // Wednesday
          todayDayKey: "2026-06-14", // Sunday — due again
        }),
      ).toBe(true);
    });

    it("is NOT due on the scheduled day it was already dropped", () => {
      expect(
        isDueToday({
          cycleDays: 1,
          customDays: WED_SUN,
          habitCreatedDayKey: "2026-06-01",
          lastDropDayKey: "2026-06-10", // Wednesday
          todayDayKey: "2026-06-10", // same Wednesday
        }),
      ).toBe(false);
    });

    it("is NOT due before the habit's created day", () => {
      expect(
        isDueToday({
          cycleDays: 1,
          customDays: WED_SUN,
          habitCreatedDayKey: "2026-06-17", // future Wednesday
          lastDropDayKey: undefined,
          todayDayKey: "2026-06-14", // Sunday before creation
        }),
      ).toBe(false);
    });
  });

  it("rejects cycleDays < 1", () => {
    expect(() =>
      isDueToday({
        cycleDays: 0,
        habitCreatedDayKey: "2026-05-01",
        lastDropDayKey: undefined,
        todayDayKey: "2026-05-07",
      }),
    ).toThrow(/cycleDays/);
  });
});
