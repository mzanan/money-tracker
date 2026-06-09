"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  lastCurrency: string | null;
  setLastCurrency: (code: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      lastCurrency: null,
      setLastCurrency: (lastCurrency) => set({ lastCurrency }),
    }),
    { name: "money-tracker-ui" },
  ),
);
