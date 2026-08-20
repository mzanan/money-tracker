"use client";

import { useMemo } from "react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { monthBounds } from "@/lib/dates";
import { excludePaidReminders } from "@/lib/fixedExpenses";
import { computeSpendProjection } from "@/lib/spendProjection";
import { periodTotals } from "@/lib/totals";

import type { RecurringPayment, Transaction } from "@/types/db";

export function useSpendProjection({
  yearMonth,
  today,
  monthTransactions,
  reminders,
}: {
  yearMonth: string;
  today: string;
  monthTransactions: Transaction[];
  reminders: RecurringPayment[];
}) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const fixedLabels = settings.fixed_labels;

  const isCurrentMonth = yearMonth === today.slice(0, 7);

  const unpaidRecurring = useMemo(() => {
    if (!isCurrentMonth) return [];
    const [monthStart, monthEnd] = monthBounds(yearMonth);
    const dueThisMonth = reminders.filter(
      (r) => r.next_due_on >= monthStart && r.next_due_on <= monthEnd,
    );
    return excludePaidReminders(dueThisMonth, monthTransactions, yearMonth);
  }, [reminders, yearMonth, isCurrentMonth, monthTransactions]);

  const projection = useMemo(() => {
    if (!isCurrentMonth) return null;
    return computeSpendProjection({
      yearMonth,
      today,
      monthTransactions,
      unpaidRecurring,
      fixedLabels,
      baseCurrency: settings.base_currency,
      rates: ratesQuery.data?.rates ?? null,
    });
  }, [
    isCurrentMonth,
    yearMonth,
    today,
    monthTransactions,
    unpaidRecurring,
    fixedLabels,
    settings.base_currency,
    ratesQuery.data,
  ]);

  const realTotal = useMemo(() => {
    if (isCurrentMonth) return null;
    return periodTotals(
      excludeCanceledPairs(monthTransactions),
      settings.base_currency,
    ).expense;
  }, [isCurrentMonth, monthTransactions, settings.base_currency]);

  return { isCurrentMonth, projection, realTotal };
}
