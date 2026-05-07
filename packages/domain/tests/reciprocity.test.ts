import { describe, expect, it } from "vitest";
import { shouldLockFeed } from "../src/reciprocity";

const HOUR = 60 * 60 * 1000;

describe("shouldLockFeed", () => {
  it("unlocks if caller dropped today", () => {
    expect(
      shouldLockFeed({
        callerHasDroppedToday: true,
        callerCreatedAtMs: 0,
        nowMs: 100 * 24 * HOUR,
      }),
    ).toBe(false);
  });

  it("unlocks during 24-hour first-time grace period", () => {
    const now = 1_700_000_000_000;
    expect(
      shouldLockFeed({
        callerHasDroppedToday: false,
        callerCreatedAtMs: now - 23 * HOUR,
        nowMs: now,
      }),
    ).toBe(false);
  });

  it("locks once grace period expires and caller has not dropped today", () => {
    const now = 1_700_000_000_000;
    expect(
      shouldLockFeed({
        callerHasDroppedToday: false,
        callerCreatedAtMs: now - 25 * HOUR,
        nowMs: now,
      }),
    ).toBe(true);
  });

  it("dropping today wins even within grace period", () => {
    const now = 1_700_000_000_000;
    expect(
      shouldLockFeed({
        callerHasDroppedToday: true,
        callerCreatedAtMs: now - 12 * HOUR,
        nowMs: now,
      }),
    ).toBe(false);
  });
});
