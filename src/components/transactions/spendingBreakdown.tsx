"use client";

import Link from "next/link";
import { MapPinIcon } from "lucide-react";

import { UNTAGGED_LABEL } from "@/lib/constants/tags";
import { formatMoney } from "@/lib/currency";
import { HIDDEN_AMOUNT } from "@/lib/preferences";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PlacesDialog } from "./placesDialog";
import { useSpendingBreakdown, type Mode } from "./useSpendingBreakdown";

import type { Location, Transaction } from "@/types/db";

interface Props {
  transactions: Transaction[];
  places: Location[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  selectedPlace: string | null;
  onSelectPlace: (place: string | null) => void;
  limit?: number;
  moreHref?: string;
}

export function SpendingBreakdown(props: Props) {
  const { places, moreHref } = props;
  const {
    mode,
    changeMode,
    selected,
    onSelect,
    breakdown,
    hideAmounts,
    baseCurrency,
  } = useSpendingBreakdown(props);

  if (breakdown.list.length === 0) return null;

  return (
    <Surface padding="md" className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-eyebrow">Spending by</span>
        <div className="flex items-center gap-1">
          <Tabs value={mode} onValueChange={(v) => changeMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="tag">Tag</TabsTrigger>
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
                    item.label === UNTAGGED_LABEL && "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {hideAmounts
                    ? HIDDEN_AMOUNT
                    : formatMoney(item.amount, baseCurrency)}
                  <span className="text-muted-foreground ml-1.5 text-caption font-normal">
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
          {moreHref && breakdown.hidden > 0 && (
            <Link
              href={moreHref}
              className="text-muted-foreground hover:text-foreground pt-1 text-xs font-medium transition-colors"
            >
              View all in Dashboard →
            </Link>
          )}
        </div>
      )}
    </Surface>
  );
}
