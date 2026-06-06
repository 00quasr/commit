import type { Id } from "@commit/convex/dataModel";
import { create } from "zustand";

interface DropDraftState {
  habitId: Id<"habits"> | null;
  photoUri: string | null;
  start: (habitId: Id<"habits">) => void;
  setPhoto: (uri: string | null) => void;
  cancel: () => void;
}

export const useDropDraft = create<DropDraftState>((set) => ({
  habitId: null,
  photoUri: null,
  start: (habitId) =>
    set({
      habitId,
      photoUri: null,
    }),
  setPhoto: (uri) => set({ photoUri: uri }),
  cancel: () =>
    set({
      habitId: null,
      photoUri: null,
    }),
}));
