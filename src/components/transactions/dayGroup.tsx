"use client";

import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { formatDayLong } from "@/lib/dates";
import type { DayTotals } from "@/lib/totals";

import { TransactionRow } from "./transactionRow";

export function DayGroup({ day }: { day: DayTotals }) {
  const settings = useSettings();
  const net = day.income - day.expense;
  const hasNet = day.income > 0 || day.expense > 0;

  return (
    <section className="grid gap-1">
      <header className="flex items-baseline justify-between gap-3 px-3 pt-4 pb-1">
        <h3 className="text-muted-foreground text-[13px] font-medium">
          {formatDayLong(day.date)}
        </h3>
        {hasNet && (
          <span
            className={
              net >= 0
                ? "text-income text-[11px] tabular-nums"
                : "text-muted-foreground text-[11px] tabular-nums"
            }
          >
            {net >= 0 ? "+" : "-"}
            {formatMoney(Math.abs(net), settings.base_currency)}
          </span>
        )}
      </header>
      <div className="grid">
        {day.transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </div>
    </section>
  );
}
