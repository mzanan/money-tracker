"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { formatDayLong } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DayTotals } from "@/lib/totals";

import { TransactionRow } from "./transactionRow";

export function DayGroup({
  day,
  defaultOpen = false,
}: {
  day: DayTotals;
  defaultOpen?: boolean;
}) {
  const settings = useSettings();
  const [open, setOpen] = useState(defaultOpen);
  const count = day.transactions.length;

  return (
    <section className="grid">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="hover:bg-surface-2/60 focus-visible:ring-ring flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="grid min-w-0">
            <span className="text-foreground truncate text-sm font-medium">
              {formatDayLong(day.date)}
            </span>
            <span className="text-muted-foreground text-meta">
              {count === 1 ? "1 entry" : `${count} entries`}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
          {day.income > 0 && (
            <span className="text-income text-base font-semibold">
              +{formatMoney(day.income, settings.base_currency)}
            </span>
          )}
          {day.expense > 0 && (
            <span className="text-foreground text-base font-semibold">
              -{formatMoney(day.expense, settings.base_currency)}
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="grid">
          {day.transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </section>
  );
}
