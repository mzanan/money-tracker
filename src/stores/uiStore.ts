"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DisplayMode = "snapshot" | "today";

interface UiState {
  /** snapshot = totals using frozen rates; today = live recalculation. */
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  lastCurrency: string | null;
  setLastCurrency: (code: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      displayMode: "snapshot",
      setDisplayMode: (displayMode) => set({ displayMode }),
      lastCurrency: null,
      setLastCurrency: (lastCurrency) => set({ lastCurrency }),
    }),
    { name: "money-tracker-ui" },
  ),
);
