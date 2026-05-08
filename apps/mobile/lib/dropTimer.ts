import type { Id } from "@commit/convex/dataModel";
import { useEffect, useState } from "react";
import { create } from "zustand";

export type DropDifficulty = "easy" | "medium" | "hard";

export const DROP_WINDOW_MS = 60_000;

interface DropTimerState {
  habitId: Id<"habits"> | null;
  difficulty: DropDifficulty | null;
  expiresAt: number | null;
  start: (habitId: Id<"habits">, difficulty: DropDifficulty, durationMs?: number) => void;
  cancel: () => void;
}

/**
 * Cross-screen state for the 60-second drop window. Screens share a single
 * `expiresAt` timestamp (Date.now()-based, NOT setInterval-based) so the
 * countdown survives the user backgrounding the app — VISION §5.2 demands
 * the time pressure can't be paused by switching apps.
 */
export const useDropTimer = create<DropTimerState>((set) => ({
  habitId: null,
  difficulty: null,
  expiresAt: null,
  start: (habitId, difficulty, durationMs = DROP_WINDOW_MS) =>
    set({ habitId, difficulty, expiresAt: Date.now() + durationMs }),
  cancel: () => set({ habitId: null, difficulty: null, expiresAt: null }),
}));

/**
 * Re-renders ~4× per second with the remaining ms until expiry. Returns 0
 * once expired. Returns null if no timer is active.
 */
export function useTimerRemaining(): number | null {
  const expiresAt = useDropTimer((s) => s.expiresAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (expiresAt === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (expiresAt === null) return null;
  return Math.max(0, expiresAt - now);
}
