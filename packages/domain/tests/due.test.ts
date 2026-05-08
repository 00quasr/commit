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
