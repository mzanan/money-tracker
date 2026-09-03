"use client";

import { useMemo } from "react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { monthBounds, shiftYearMonth } from "@/lib/dates";
import { excludePaidReminders, splitFixedVariable } from "@/lib/fixedExpenses";
import {
  computeSpendProjection,
  monthElapsedTransactions,
  monthScheduledFixed,
} from "@/lib/spendProjection";
import { periodTotals } from "@/lib/totals";

import type { RecurringPayment, Transaction } from "@/types/db";

export const PROJECTION_OVERDUE_MONTHS = 1;

export function useSpendProjection({
  yearMonth,
  today,
  monthTransactions,
  lifetimeTransactions,
  reminders,
  recurringNotes,
}: {
  yearMonth: string;
  today: string;
  monthTransactions: Transaction[];
  lifetimeTransactions: Transaction[];
  reminders: RecurringPayment[];
  recurringNotes: Set<string>;
}) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const fixedLabels = settings.fixed_labels;

  const isCurrentMonth = yearMonth === today.slice(0, 7);

  const unpaidRecurring = useMemo(() => {
    if (!isCurrentMonth) return [];
    const [, monthEnd] = monthBounds(yearMonth);
    const [overdueFrom] = monthBounds(
      shiftYearMonth(yearMonth, -PROJECTION_OVERDUE_MONTHS),
    );
    const dueInWindow = reminders.filter(
      (r) => r.next_due_on >= overdueFrom && r.next_due_on <= monthEnd,
    );
    const paymentHistory = excludeCanceledPairs(lifetimeTransactions).filter(
      (tx) => tx.occurred_on >= overdueFrom,
    );
    return excludePaidReminders(dueInWindow, paymentHistory);
  }, [reminders, yearMonth, isCurrentMonth, lifetimeTransactions]);

  const projection = useMemo(() => {
    if (!isCurrentMonth) return null;
    return computeSpendProjection({
      yearMonth,
      today,
      monthTransactions,
      unpaidRecurring,
      fixedLabels,
      recurringNotes,
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
    recurringNotes,
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

  const fixedCounts = useMemo(() => {
    if (!isCurrentMonth) return { paid: 0, upcoming: 0 };
    const elapsed = monthElapsedTransactions(monthTransactions, today);
    const { fixed } = splitFixedVariable(elapsed, fixedLabels, recurringNotes);
    const scheduled = monthScheduledFixed(
      monthTransactions,
      today,
      fixedLabels,
      recurringNotes,
    );
    return {
      paid: fixed.length,
      upcoming: unpaidRecurring.length + scheduled.length,
    };
  }, [
    isCurrentMonth,
    monthTransactions,
    today,
    fixedLabels,
    recurringNotes,
    unpaidRecurring,
  ]);

  return {
    isCurrentMonth,
    projection,
    realTotal,
    fixedPaidCount: fixedCounts.paid,
    fixedUpcomingCount: fixedCounts.upcoming,
  };
}
