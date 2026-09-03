"use client";

import { useMemo } from "react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { splitFixedVariable } from "@/lib/fixedExpenses";
import {
  computeSpendProjection,
  monthElapsedTransactions,
  monthScheduledFixed,
  overdueUnpaidReminders,
} from "@/lib/spendProjection";
import { periodTotals } from "@/lib/totals";

import type { RecurringPayment, Transaction } from "@/types/db";

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
    return overdueUnpaidReminders({
      reminders,
      lifetimeTransactions,
      yearMonth,
    });
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
