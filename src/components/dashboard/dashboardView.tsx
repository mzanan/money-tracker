"use client";

import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { formatYearMonthLong } from "@/lib/dates";
import { HIDDEN_AMOUNT } from "@/lib/preferences";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { SpendingBreakdown } from "@/components/transactions/spendingBreakdown";
import { MonthView } from "@/components/transactions/monthView";

import { useDashboardView } from "./useDashboardView";

import type { Location, Transaction } from "@/types/db";

interface Props {
  yearMonth: string;
  lifetimeTransactions: Transaction[];
  places: Location[];
}

export function DashboardView({
  yearMonth,
  lifetimeTransactions,
  places,
}: Props) {
  const settings = useSettings();
  const { hideAmounts } = useHideAmounts();
  const v = useDashboardView({ yearMonth, lifetimeTransactions });

  function money(value: number): string {
    return hideAmounts
      ? HIDDEN_AMOUNT
      : formatMoney(value, settings.base_currency);
  }

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5 *:min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            disabled={!v.hasOlder}
            onClick={() => v.shiftMonth(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-28 text-center text-sm font-medium">
            {formatYearMonthLong(v.visibleYearMonth)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            disabled={!v.hasNewer}
            onClick={() => v.shiftMonth(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <Surface padding="md" className="grid gap-3">
        <span className="text-eyebrow">Monthly trend</span>
        <div className="flex items-end justify-between gap-2">
          {v.trend.map((month) => (
            <button
              key={month.month}
              type="button"
              aria-pressed={month.month === v.visibleYearMonth}
              onClick={() => v.setVisibleYearMonth(month.month)}
              className="group flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg"
            >
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {money(month.expense)}
              </span>
              <span className="flex h-24 w-full items-end justify-center">
                <span
                  className={cn(
                    "w-3/5 rounded-t-md transition-colors",
                    month.month === v.visibleYearMonth
                      ? "bg-primary"
                      : "bg-primary/30 group-hover:bg-primary/50",
                  )}
                  style={{
                    height: `${v.trendMax > 0 ? Math.max((month.expense / v.trendMax) * 100, 2) : 2}%`,
                  }}
                />
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  month.month === v.visibleYearMonth
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {month.label}
              </span>
            </button>
          ))}
        </div>
        <div className="border-border flex items-center justify-between gap-3 border-t pt-3 text-sm">
          <span className="text-muted-foreground">
            Spent {formatYearMonthLong(v.visibleYearMonth)}
          </span>
          <span className="font-semibold tabular-nums">
            {money(v.monthExpense)}
          </span>
        </div>
        <div className="-mt-1.5 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Average per day</span>
          <span className="font-semibold tabular-nums">
            {money(v.avgPerDay)}
          </span>
        </div>
      </Surface>

      <SpendingBreakdown
        transactions={v.monthTransactions}
        places={places}
        selectedTag={v.selectedTag}
        onSelectTag={v.setSelectedTag}
        selectedPlace={v.selectedPlace}
        onSelectPlace={v.setSelectedPlace}
      />

      {v.cashBalances.length > 0 && (
        <Surface padding="md" className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-eyebrow">Cash on hand</span>
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                Withdraw cash →
              </Link>
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                Exchange cash →
              </Link>
            </div>
          </div>
          <ul className="grid gap-2">
            {v.cashBalances.map(({ currency, balance }) => (
              <li
                key={currency}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="font-medium">{currency}</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    balance < 0 && "text-destructive",
                  )}
                >
                  {hideAmounts ? HIDDEN_AMOUNT : formatMoney(balance, currency)}
                </span>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <Surface padding="md" className="grid gap-3">
        <span className="text-eyebrow">Top merchants</span>
        {v.topMerchants.length > 0 ? (
          <ul className="grid gap-2">
            {v.topMerchants.map((merchant) => (
              <li
                key={merchant.label}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate font-medium">
                  {merchant.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {money(merchant.total)}
                  <span className="text-muted-foreground ml-1.5 text-caption font-normal">
                    ×{merchant.count}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No expenses this month.
          </p>
        )}
      </Surface>

      {v.filteredList.length > 0 && (
        <MonthView
          transactions={v.filteredList}
          emptyLabel="No transactions."
        />
      )}
    </div>
  );
}
