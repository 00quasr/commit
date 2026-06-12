import type { Id } from "@commit/convex/dataModel";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface DropDraftState {
  habitId: Id<"habits"> | null;
  photoUri: string | null;
  caption: string;
  start: (habitId: Id<"habits">) => void;
  setPhoto: (uri: string | null) => void;
  setCaption: (caption: string) => void;
  cancel: () => void;
}

// Persisted via AsyncStorage so an in-progress drop (habit + captured photo +
// typed caption) survives an OS low-memory kill mid-compose instead of being
// silently lost (COM-139). `start`/`cancel` reset all three fields.
export const useDropDraft = create<DropDraftState>()(
  persist(
    (set) => ({
      habitId: null,
      photoUri: null,
      caption: "",
      start: (habitId) => set({ habitId, photoUri: null, caption: "" }),
      setPhoto: (uri) => set({ photoUri: uri }),
      setCaption: (caption) => set({ caption }),
      cancel: () => set({ habitId: null, photoUri: null, caption: "" }),
    }),
    {
      name: "commit.dropDraft",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
