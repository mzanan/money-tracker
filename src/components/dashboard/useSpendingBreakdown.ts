"use client";

import { useMemo, useState } from "react";

import { useMoney } from "@/hooks/useMoney";
import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useSettings } from "@/hooks/useSettings";
import { UNTAGGED_LABEL } from "@/lib/constants/tags";
import { monthExpenseMovements } from "@/lib/ledger/canceledPairs";
import { movementSpend } from "@/lib/ledger/valuation";
import { placeOf } from "@/lib/places";

import type { Location } from "@/types/db";
import type { Movement } from "@/types/ledger";

export type Mode = "tag" | "place";

interface Params {
  transactions: Movement[];
  places: Location[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  selectedPlace: string | null;
  onSelectPlace: (place: string | null) => void;
}

export function useSpendingBreakdown({
  transactions,
  places,
  selectedTag,
  onSelectTag,
  selectedPlace,
  onSelectPlace,
}: Params) {
  const settings = useSettings();
  const money = useMoney();
  const ratesByDate = useRatesByDate();
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
    for (const tx of monthExpenseMovements(transactions)) {
      const value = movementSpend(tx, settings.base_currency, ratesByDate);
      if (value == null) continue;
      const keys =
        mode === "tag"
          ? tx.tags.length > 0
            ? tx.tags
            : [UNTAGGED_LABEL]
          : [placeOf(tx.occurredOn, places)];
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
    return { list, max: list[0]?.amount ?? 0 };
  }, [transactions, settings.base_currency, ratesByDate, mode, places]);

  return {
    mode,
    changeMode,
    selected,
    onSelect,
    breakdown,
    money,
  };
}
