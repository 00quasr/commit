import type { Id } from "@commit/convex/dataModel";
import { create } from "zustand";

export type DropDifficulty = "easy" | "medium" | "hard";

interface DropDraftState {
  habitId: Id<"habits"> | null;
  difficulty: DropDifficulty | null;
  photoUri: string | null;
  voiceUri: string | null;
  start: (habitId: Id<"habits">, difficulty: DropDifficulty) => void;
  setPhoto: (uri: string | null) => void;
  setVoice: (uri: string | null) => void;
  cancel: () => void;
}

/**
 * Cross-screen state for the in-progress drop. Holds the habit + difficulty
 * picked on the habit detail screen and the photo/voice URIs captured during
 * camera + compose steps so they survive navigation between screens.
 */
export const useDropDraft = create<DropDraftState>((set) => ({
  habitId: null,
  difficulty: null,
  photoUri: null,
  voiceUri: null,
  start: (habitId, difficulty) =>
    set({
      habitId,
      difficulty,
      photoUri: null,
      voiceUri: null,
    }),
  setPhoto: (uri) => set({ photoUri: uri }),
  setVoice: (uri) => set({ voiceUri: uri }),
  cancel: () =>
    set({
      habitId: null,
      difficulty: null,
      photoUri: null,
      voiceUri: null,
    }),
}));
