"use client";

import { useMemo } from "react";

import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { UNCATEGORIZED_LABEL } from "@/lib/constants/categories";
import { formatMoney } from "@/lib/currency";
import { transactionInDisplay } from "@/lib/totals";
import { cn } from "@/lib/utils";

import { Surface } from "@/components/ui/surface";

import { HIDDEN_AMOUNT } from "./amountsToggle";

import type { Transaction } from "@/types/db";

interface Props {
  transactions: Transaction[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryBreakdown({ transactions, selected, onSelect }: Props) {
  const settings = useSettings();
  const { hideAmounts } = useHideAmounts();

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
      const key = tx.category ?? UNCATEGORIZED_LABEL;
      totals.set(key, (totals.get(key) ?? 0) + value);
      total += value;
    }
    const list = Array.from(totals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
    return { list, max: list[0]?.amount ?? 0 };
  }, [transactions, settings.base_currency]);

  if (breakdown.list.length === 0) return null;

  return (
    <Surface padding="md" className="grid gap-4">
      <span className="text-eyebrow">Spending by category</span>
      <div className="grid gap-3">
        {breakdown.list.map((item) => (
          <button
            key={item.category}
            type="button"
            aria-pressed={selected === item.category}
            onClick={() =>
              onSelect(selected === item.category ? null : item.category)
            }
            className={cn(
              "focus-visible:ring-ring grid cursor-pointer gap-1.5 rounded-lg text-left transition-opacity focus-visible:ring-2 focus-visible:outline-none",
              selected !== null && selected !== item.category && "opacity-40",
            )}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  item.category === UNCATEGORIZED_LABEL &&
                    "text-muted-foreground",
                )}
              >
                {item.category}
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
    </Surface>
  );
}
