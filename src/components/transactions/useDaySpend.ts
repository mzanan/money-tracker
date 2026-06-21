"use client";

import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";

import { useSettings } from "@/hooks/useSettings";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { monthBounds } from "@/lib/dates";
import { dayTotalsList } from "@/lib/totals";

import type { Transaction } from "@/types/db";

interface Args {
  yearMonth: string;
  transactions: Transaction[];
  today: string;
}

export function useDaySpend({ yearMonth, transactions, today }: Args) {
  const settings = useSettings();

  const [monthStart, monthEnd] = monthBounds(yearMonth);
  const todayInMonth = today >= monthStart && today <= monthEnd;

  const byDay = useMemo(() => {
    const map = new Map<string, { expense: number; count: number }>();
    const real = excludeCanceledPairs(transactions);
    for (const day of dayTotalsList(real, settings.base_currency)) {
      const expenseCount = day.transactions.filter(
        (t) => t.kind === "expense",
      ).length;
      map.set(day.date, { expense: day.expense, count: expenseCount });
    }
    return map;
  }, [transactions, settings.base_currency]);

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

  const [rawSelectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedDate = useMemo(() => {
    if (
      rawSelectedDate &&
      rawSelectedDate >= monthStart &&
      rawSelectedDate <= monthEnd
    ) {
      return rawSelectedDate;
    }
    if (todayInMonth) return today;
    const activity = Array.from(byDay.keys())
      .filter((d) => d >= monthStart && d <= monthEnd)
      .sort();
    return activity[activity.length - 1] ?? monthEnd;
  }, [rawSelectedDate, monthStart, monthEnd, todayInMonth, today, byDay]);

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
  const dayLabel = isToday
    ? "Today"
    : format(parseISO(selectedDate), "EEE LLL d");

  return {
    selectedDate,
    setSelectedDate,
    expense,
    count,
    daysInMonth,
    byDay,
    maxExpense,
    todayInMonth,
    today,
    canPrev,
    canNext,
    shift,
    dayLabel,
  };
}
