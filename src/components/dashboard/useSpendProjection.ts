"use client";

import { useMemo } from "react";

import { useRates } from "@/hooks/useRates";
import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useSettings } from "@/hooks/useSettings";
import { ALL_SOURCES } from "@/lib/constants/sources";
import { splitFixedVariable } from "@/lib/fixedExpenses";
import { excludeCanceledPairs } from "@/lib/ledger/canceledPairs";
import { periodTotals } from "@/lib/ledger/scope";
import {
  computeSpendProjection,
  monthElapsedTransactions,
  monthScheduledFixed,
  overdueUnpaidReminders,
} from "@/lib/spendProjection";

import type { RecurringPayment } from "@/types/db";
import type { Movement } from "@/types/ledger";

export function useSpendProjection({
  yearMonth,
  today,
  monthTransactions,
  lifetimeMovements,
  reminders,
  recurringNotes,
}: {
  yearMonth: string;
  today: string;
  monthTransactions: Movement[];
  lifetimeMovements: Movement[];
  reminders: RecurringPayment[];
  recurringNotes: Set<string>;
}) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const ratesByDate = useRatesByDate();
  const fixedLabels = settings.fixed_labels;

  const isCurrentMonth = yearMonth === today.slice(0, 7);

  const unpaidRecurring = useMemo(() => {
    if (!isCurrentMonth) return [];
    return overdueUnpaidReminders({
      reminders,
      lifetimeMovements,
      yearMonth,
    });
  }, [reminders, yearMonth, isCurrentMonth, lifetimeMovements]);

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
      ratesByDate,
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
    ratesByDate,
  ]);

  const realTotal = useMemo(() => {
    if (isCurrentMonth) return null;
    return periodTotals(
      excludeCanceledPairs(monthTransactions),
      ALL_SOURCES,
      settings.base_currency,
      ratesByDate,
    ).expense;
  }, [isCurrentMonth, monthTransactions, settings.base_currency, ratesByDate]);

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
