"use client";

import { useMemo, useState } from "react";

import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { UNTAGGED_LABEL } from "@/lib/constants/tags";
import { placeOf } from "@/lib/places";
import { safeTransactionInDisplay } from "@/lib/totals";

import type { Location, Transaction } from "@/types/db";

export type Mode = "tag" | "place";

interface Params {
  transactions: Transaction[];
  places: Location[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  selectedPlace: string | null;
  onSelectPlace: (place: string | null) => void;
  limit?: number;
}

export function useSpendingBreakdown({
  transactions,
  places,
  selectedTag,
  onSelectTag,
  selectedPlace,
  onSelectPlace,
  limit,
}: Params) {
  const settings = useSettings();
  const { hideAmounts } = useHideAmounts();
  const [mode, setMode] = useState<Mode>("tag");

  const selected = mode === "tag" ? selectedTag : selectedPlace;
  const onSelect = mode === "tag" ? onSelectTag : onSelectPlace;

  function changeMode(next: Mode) {
    setMode(next);
    onSelectTag(null);
    onSelectPlace(null);
  }

  const breakdown = useMemo(() => {
    const totals = new Map<string, number>();
    let total = 0;
    for (const tx of excludeCanceledPairs(transactions)) {
      if (tx.kind !== "expense" || tx.transfer_group) continue;
      const value = safeTransactionInDisplay(tx, settings.base_currency);
      if (value == null) continue;
      const keys =
        mode === "tag"
          ? tx.tags.length > 0
            ? tx.tags
            : [UNTAGGED_LABEL]
          : [placeOf(tx.occurred_on, places)];
      for (const key of keys) {
        totals.set(key, (totals.get(key) ?? 0) + value);
      }
      total += value;
    }
    const list = Array.from(totals.entries())
      .map(([label, amount]) => ({
        label,
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
    const visible = limit ? list.slice(0, limit) : list;
    return {
      list: visible,
      hidden: list.length - visible.length,
      max: list[0]?.amount ?? 0,
    };
  }, [transactions, settings.base_currency, mode, places, limit]);

  return {
    mode,
    changeMode,
    selected,
    onSelect,
    breakdown,
    hideAmounts,
    baseCurrency: settings.base_currency,
  };
}
