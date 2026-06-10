"use client";

import { useMemo, useState } from "react";
import { MapPinIcon } from "lucide-react";

import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { UNCATEGORIZED_LABEL } from "@/lib/constants/categories";
import { formatMoney } from "@/lib/currency";
import { placeOf } from "@/lib/places";
import { transactionInDisplay } from "@/lib/totals";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { HIDDEN_AMOUNT } from "./amountsToggle";
import { PlacesDialog } from "./placesDialog";

import type { Location, Transaction } from "@/types/db";

type Mode = "category" | "place";

interface Props {
  transactions: Transaction[];
  places: Location[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  selectedPlace: string | null;
  onSelectPlace: (place: string | null) => void;
}

export function SpendingBreakdown({
  transactions,
  places,
  selectedCategory,
  onSelectCategory,
  selectedPlace,
  onSelectPlace,
}: Props) {
  const settings = useSettings();
  const { hideAmounts } = useHideAmounts();
  const [mode, setMode] = useState<Mode>("category");

  const selected = mode === "category" ? selectedCategory : selectedPlace;
  const onSelect = mode === "category" ? onSelectCategory : onSelectPlace;

  function changeMode(next: Mode) {
    setMode(next);
    onSelectCategory(null);
    onSelectPlace(null);
  }

  const breakdown = useMemo(() => {
    const totals = new Map<string, number>();
    let total = 0;
    for (const tx of transactions) {
      if (tx.kind !== "expense") continue;
      let value: number;
      try {
        value = transactionInDisplay(tx, settings.base_currency);
      } catch {
        continue;
      }
      const key =
        mode === "category"
          ? (tx.category ?? UNCATEGORIZED_LABEL)
          : placeOf(tx.occurred_on, places);
      totals.set(key, (totals.get(key) ?? 0) + value);
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
  }, [transactions, settings.base_currency, mode, places]);

  if (breakdown.list.length === 0) return null;

  return (
    <Surface padding="md" className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-eyebrow">Spending by</span>
        <div className="flex items-center gap-1">
          <Tabs value={mode} onValueChange={(v) => changeMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="category">Category</TabsTrigger>
              <TabsTrigger value="place">Place</TabsTrigger>
            </TabsList>
          </Tabs>
          {mode === "place" && (
            <PlacesDialog
              places={places}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit places"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MapPinIcon />
                </Button>
              }
            />
          )}
        </div>
      </div>
      {mode === "place" && places.length === 0 ? (
        <PlacesDialog
          places={places}
          trigger={
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg py-6 text-center text-sm transition-colors"
            >
              Add the places you have stayed to split spending by location.
            </button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {breakdown.list.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={selected === item.label}
              onClick={() =>
                onSelect(selected === item.label ? null : item.label)
              }
              className={cn(
                "focus-visible:ring-ring grid cursor-pointer gap-1.5 rounded-lg text-left transition-opacity focus-visible:ring-2 focus-visible:outline-none",
                selected !== null && selected !== item.label && "opacity-40",
              )}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    item.label === UNCATEGORIZED_LABEL &&
                      "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {hideAmounts
                    ? HIDDEN_AMOUNT
                    : formatMoney(item.amount, settings.base_currency)}
                  <span className="text-muted-foreground ml-1.5 text-[11px] font-normal">
                    {Math.round(item.pct)}%
                  </span>
                </span>
              </span>
              <span className="bg-surface-2 h-1.5 overflow-hidden rounded-full">
                <span
                  className="bg-primary block h-full rounded-full"
                  style={{
                    width: `${breakdown.max > 0 ? (item.amount / breakdown.max) * 100 : 0}%`,
                  }}
                />
              </span>
            </button>
          ))}
        </div>
      )}
    </Surface>
  );
}
