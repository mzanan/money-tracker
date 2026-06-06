"use client";

import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { monthBounds } from "@/lib/dates";
import { dayTotalsList } from "@/lib/totals";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

import { Button } from "@/components/ui/button";

import type { Transaction } from "@/types/db";

const CHART_HEIGHT = 56;
const MIN_BAR_HEIGHT = 2;

interface Props {
  yearMonth: string;
  transactions: Transaction[];
  today: string;
}

export function DaySpendView({ yearMonth, transactions, today }: Props) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const displayMode = useUiStore((s) => s.displayMode);

  const [monthStart, monthEnd] = monthBounds(yearMonth);
  const todayInMonth = today >= monthStart && today <= monthEnd;

  const byDay = useMemo(() => {
    const map = new Map<string, { expense: number; count: number }>();
    for (const day of dayTotalsList(
      transactions,
      settings.base_currency,
      displayMode,
      ratesQuery.data?.rates,
    )) {
      const expenseCount = day.transactions.filter(
        (t) => t.kind === "expense",
      ).length;
      map.set(day.date, { expense: day.expense, count: expenseCount });
    }
    return map;
  }, [transactions, settings.base_currency, displayMode, ratesQuery.data]);

  const daysInMonth = useMemo(() => {
    const out: string[] = [];
    let cursor = parseISO(monthStart);
    const end = parseISO(monthEnd);
    while (cursor <= end) {
      out.push(format(cursor, "yyyy-MM-dd"));
      cursor = addDays(cursor, 1);
    }
    return out;
  }, [monthStart, monthEnd]);

  const maxExpense = useMemo(() => {
    let max = 0;
    for (const d of byDay.values()) if (d.expense > max) max = d.expense;
    return max;
  }, [byDay]);

  const initialDate = (() => {
    if (todayInMonth) return today;
    const activity = Array.from(byDay.keys())
      .filter((d) => d >= monthStart && d <= monthEnd)
      .sort();
    return activity[activity.length - 1] ?? monthEnd;
  })();

  const [selectedDate, setSelectedDate] = useState(initialDate);

  const selected = byDay.get(selectedDate);
  const expense = selected?.expense ?? 0;
  const count = selected?.count ?? 0;

  const canPrev = selectedDate > monthStart;
  const canNext =
    selectedDate < monthEnd && (!todayInMonth || selectedDate < today);

  function shift(delta: number) {
    const next = format(addDays(parseISO(selectedDate), delta), "yyyy-MM-dd");
    if (next < monthStart || next > monthEnd) return;
    if (todayInMonth && next > today) return;
    setSelectedDate(next);
  }

  const isToday = selectedDate === today;
  const eyebrow = isToday
    ? "Total spent today"
    : `Total spent · ${format(parseISO(selectedDate), "EEE LLL d")}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-eyebrow">{eyebrow}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => shift(-1)}
            disabled={!canPrev}
            aria-label="Previous day"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => shift(1)}
            disabled={!canNext}
            aria-label="Next day"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <p
        className={cn(
          "font-heading mt-2 text-[2.75rem] leading-[1.05] font-semibold tracking-tight tabular-nums",
          expense > 0 ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {formatMoney(expense, settings.base_currency)}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        {count === 0
          ? "No expenses"
          : count === 1
            ? "1 expense"
            : `${count} expenses`}
      </p>

      <div className="border-border mt-6 border-t pt-5">
        <div className="flex gap-px" style={{ height: CHART_HEIGHT }}>
          {daysInMonth.map((date) => {
            const data = byDay.get(date);
            const ratio = maxExpense > 0 ? (data?.expense ?? 0) / maxExpense : 0;
            const height = Math.max(ratio * CHART_HEIGHT, MIN_BAR_HEIGHT);
            const isSelected = date === selectedDate;
            const isAfterToday = todayInMonth && date > today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => !isAfterToday && setSelectedDate(date)}
                disabled={isAfterToday}
                aria-label={format(parseISO(date), "EEE LLL d")}
                className={cn(
                  "group flex flex-1 flex-col justify-end",
                  isAfterToday && "cursor-not-allowed",
                )}
              >
                <span
                  style={{ height }}
                  className={cn(
                    "w-full rounded-sm transition-colors",
                    isSelected
                      ? "bg-primary"
                      : "bg-muted-foreground/25 group-hover:bg-muted-foreground/50",
                    isAfterToday && "opacity-40 group-hover:bg-muted-foreground/25",
                  )}
                />
              </button>
            );
          })}
        </div>
        <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px] tabular-nums">
          <span>1</span>
          <span>{daysInMonth.length}</span>
        </div>
      </div>
    </div>
  );
}
