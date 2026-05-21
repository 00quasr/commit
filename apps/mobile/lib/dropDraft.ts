import type { Id } from "@commit/convex/dataModel";
import { create } from "zustand";

interface DropDraftState {
  habitId: Id<"habits"> | null;
  photoUri: string | null;
  voiceUri: string | null;
  start: (habitId: Id<"habits">) => void;
  setPhoto: (uri: string | null) => void;
  setVoice: (uri: string | null) => void;
  cancel: () => void;
}

export const useDropDraft = create<DropDraftState>((set) => ({
  habitId: null,
  photoUri: null,
  voiceUri: null,
  start: (habitId) =>
    set({
      habitId,
      photoUri: null,
      voiceUri: null,
    }),
  setPhoto: (uri) => set({ photoUri: uri }),
  setVoice: (uri) => set({ voiceUri: uri }),
  cancel: () =>
    set({
      habitId: null,
      photoUri: null,
      voiceUri: null,
    }),
}));
