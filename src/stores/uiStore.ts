"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { RowFacts } from "@/types/ledger";

interface UiState {
  lastCurrency: string | null;
  setLastCurrency: (code: string) => void;
  txSelectMode: boolean;
  selectedTxs: RowFacts[];
  setTxSelectMode: (on: boolean) => void;
  toggleTxSelected: (tx: RowFacts) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      lastCurrency: null,
      setLastCurrency: (lastCurrency) => set({ lastCurrency }),
      txSelectMode: false,
      selectedTxs: [],
      setTxSelectMode: (on) => set({ txSelectMode: on, selectedTxs: [] }),
      toggleTxSelected: (tx) =>
        set((state) => ({
          selectedTxs: state.selectedTxs.some((t) => t.id === tx.id)
            ? state.selectedTxs.filter((t) => t.id !== tx.id)
            : [...state.selectedTxs, tx],
        })),
    }),
    {
      name: "money-tracker-ui",
      partialize: (state) => ({ lastCurrency: state.lastCurrency }),
    },
  ),
);
