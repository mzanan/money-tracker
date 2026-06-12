"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon } from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import { splitCanceledPairs } from "@/lib/cancellations";
import { formatMoney } from "@/lib/currency";
import { formatDayLong } from "@/lib/dates";
import { transactionInDisplay } from "@/lib/totals";
import { cn } from "@/lib/utils";
import type { DayTotals } from "@/lib/totals";
import type { Transaction } from "@/types/db";

import { CanceledGroup } from "./canceledGroup";
import { TransactionRow } from "./transactionRow";

function inDisplayOrZero(tx: Transaction, baseCurrency: string): number {
  try {
    return transactionInDisplay(tx, baseCurrency);
  } catch {
    return 0;
  }
}

export function DayGroup({
  day,
  defaultOpen = false,
  open: openProp,
  onToggle,
}: {
  day: DayTotals;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const settings = useSettings();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const count = day.transactions.length;

  const { pairs, rest } = useMemo(
    () => splitCanceledPairs(day.transactions),
    [day.transactions],
  );
  const totals = useMemo(() => {
    let income = day.income;
    let expense = day.expense;
    for (const pair of pairs) {
      income -= inDisplayOrZero(pair.income, settings.base_currency);
      expense -= inDisplayOrZero(pair.expense, settings.base_currency);
    }
    return { income: Math.max(income, 0), expense: Math.max(expense, 0) };
  }, [pairs, day.income, day.expense, settings.base_currency]);

  return (
    <section className="grid min-w-0">
      <button
        type="button"
        onClick={onToggle ?? (() => setInternalOpen((current) => !current))}
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
          {totals.income > 0 && (
            <span className="text-income text-base font-semibold">
              +{formatMoney(totals.income, settings.base_currency)}
            </span>
          )}
          {totals.expense > 0 && (
            <span className="text-foreground text-base font-semibold">
              -{formatMoney(totals.expense, settings.base_currency)}
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="grid min-w-0 gap-px">
          {rest.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
          {pairs.map((pair) => (
            <CanceledGroup key={pair.expense.id} pair={pair} />
          ))}
        </div>
      )}
    </section>
  );
}
