"use client";

import { format, parseISO } from "date-fns";

import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { AmountsToggle, HIDDEN_AMOUNT } from "./amountsToggle";

import type { useDaySpend } from "./useDaySpend";

const CHART_HEIGHT = 56;
const MIN_BAR_HEIGHT = 2;

interface Props {
  daySpend: ReturnType<typeof useDaySpend>;
}

export function DaySpendView({ daySpend }: Props) {
  const settings = useSettings();
  const { hideAmounts } = useHideAmounts();
  const {
    expense,
    count,
    daysInMonth,
    byDay,
    maxExpense,
    selectedDate,
    setSelectedDate,
    todayInMonth,
    today,
  } = daySpend;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="text-eyebrow">Total spent</span>
        <AmountsToggle />
      </div>
      <p
        className={cn(
          "font-heading text-[2.75rem] leading-[1.05] font-semibold tracking-tight tabular-nums",
          expense > 0 ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {hideAmounts
          ? HIDDEN_AMOUNT
          : formatMoney(expense, settings.base_currency)}
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
