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
  const net = day.income - day.expense;
  const hasNet = day.income > 0 || day.expense > 0;
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
          <span className="text-foreground truncate text-sm font-medium">
            {formatDayLong(day.date)}
          </span>
          <span className="text-muted-foreground shrink-0 text-meta">
            {count} {count === 1 ? "tx" : "txs"}
          </span>
        </span>
        {hasNet && (
          <span
            className={cn(
              "shrink-0 text-base font-semibold tabular-nums",
              net >= 0 ? "text-income" : "text-foreground",
            )}
          >
            {net >= 0 ? "+" : "-"}
            {formatMoney(Math.abs(net), settings.base_currency)}
          </span>
        )}
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
