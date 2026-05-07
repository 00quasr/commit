import { describe, expect, it } from "vitest";
import { dayKeyInTimezone } from "../src/day-key";

describe("dayKeyInTimezone", () => {
  it("returns YYYY-MM-DD format", () => {
    const ms = Date.UTC(2026, 4, 7, 12, 0, 0); // 2026-05-07 12:00 UTC
    expect(dayKeyInTimezone(ms, "UTC")).toBe("2026-05-07");
  });

  it("respects timezone — Tokyo is ahead of UTC near midnight", () => {
    // 2026-05-07 23:30 UTC is 2026-05-08 08:30 in Tokyo (UTC+9)
    const ms = Date.UTC(2026, 4, 7, 23, 30, 0);
    expect(dayKeyInTimezone(ms, "Asia/Tokyo")).toBe("2026-05-08");
    expect(dayKeyInTimezone(ms, "UTC")).toBe("2026-05-07");
  });

  it("respects timezone — Los Angeles is behind UTC near midnight", () => {
    // 2026-05-07 02:30 UTC is 2026-05-06 19:30 in LA (UTC-7 during DST)
    const ms = Date.UTC(2026, 4, 7, 2, 30, 0);
    expect(dayKeyInTimezone(ms, "America/Los_Angeles")).toBe("2026-05-06");
    expect(dayKeyInTimezone(ms, "UTC")).toBe("2026-05-07");
  });

  it("handles DST spring-forward in Berlin", () => {
    // 2026-03-29 01:30 UTC is 02:30 CET (UTC+1) — before DST jump
    const beforeJump = Date.UTC(2026, 2, 29, 1, 30, 0);
    expect(dayKeyInTimezone(beforeJump, "Europe/Berlin")).toBe("2026-03-29");

    // 2026-03-29 04:30 UTC is 06:30 CEST (UTC+2) — after DST jump
    const afterJump = Date.UTC(2026, 2, 29, 4, 30, 0);
    expect(dayKeyInTimezone(afterJump, "Europe/Berlin")).toBe("2026-03-29");
  });

  it("handles DST fall-back in Berlin", () => {
    // 2026-10-25 is the typical DST end date
    const sameDay = Date.UTC(2026, 9, 25, 12, 0, 0);
    expect(dayKeyInTimezone(sameDay, "Europe/Berlin")).toBe("2026-10-25");
  });

  it("two users in different timezones at the same UTC instant can land on different days", () => {
    const ms = Date.UTC(2026, 4, 7, 23, 30, 0);
    const tokyoDay = dayKeyInTimezone(ms, "Asia/Tokyo");
    const laDay = dayKeyInTimezone(ms, "America/Los_Angeles");
    expect(tokyoDay).not.toBe(laDay);
  });
});
