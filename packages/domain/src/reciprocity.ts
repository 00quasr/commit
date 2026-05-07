/**
 * Whether the feed should be locked for a caller.
 *
 * Rule today: locked unless caller has dropped today.
 *
 * VISION §5.1 mentions a 24-hour grace period for first-time users. That
 * lives here too so it's testable and so future tweaks (e.g. grace period
 * for users returning from a long absence) have a single home.
 */

export interface ReciprocityInput {
  callerHasDroppedToday: boolean;
  callerCreatedAtMs: number;
  nowMs: number;
}

const FIRST_TIME_GRACE_MS = 24 * 60 * 60 * 1000;

export function shouldLockFeed(input: ReciprocityInput): boolean {
  const { callerHasDroppedToday, callerCreatedAtMs, nowMs } = input;
  if (callerHasDroppedToday) return false;
  if (nowMs - callerCreatedAtMs < FIRST_TIME_GRACE_MS) return false;
  return true;
}
