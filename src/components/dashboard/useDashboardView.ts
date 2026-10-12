"use client";

import { useMemo, useState } from "react";
import { format, parse } from "date-fns";

import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { todayInTz } from "@/lib/dates";
import { ALL_SOURCES } from "@/lib/constants/sources";
import { UNTAGGED_LABEL } from "@/lib/constants/tags";
import {
  effectiveYearMonth,
  forwardMonthCap,
  monthBounds,
  newestYearMonthFrom,
  oldestYearMonthFrom,
  shiftYearMonth,
} from "@/lib/dates";
import { splitFixedVariable } from "@/lib/fixedExpenses";
import { monthExpenseMovements } from "@/lib/ledger/canceledPairs";
import { assetLines } from "@/lib/ledger/movements";
import { periodTotals } from "@/lib/ledger/scope";
import { movementSpend } from "@/lib/ledger/valuation";
import { detectRecurringNotes } from "@/lib/unusualExpenses";

import type { Movement } from "@/types/ledger";

const TREND_MONTHS = 6;

export function useDashboardView({
  yearMonth,
  movements: lifetimeMovements,
}: {
  yearMonth: string;
  movements: Movement[];
}) {
  const settings = useSettings();
  const ratesByDate = useRatesByDate();
  const [visibleYearMonth, setVisibleYearMonth] = useState(yearMonth);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);

  const oldestYearMonth = useMemo(
    () => oldestYearMonthFrom(lifetimeMovements),
    [lifetimeMovements],
  );
  const newestYearMonth = useMemo(
    () => newestYearMonthFrom(lifetimeMovements),
    [lifetimeMovements],
  );
  const forwardCap = forwardMonthCap(yearMonth, newestYearMonth);
  const hasOlder =
    oldestYearMonth !== null &&
    shiftYearMonth(visibleYearMonth, -1) >= oldestYearMonth;
  const hasNewer = visibleYearMonth < forwardCap;

  function shiftMonth(delta: number) {
    setVisibleYearMonth((current) => {
      const next = shiftYearMonth(current, delta);
      if (delta < 0 && oldestYearMonth !== null && next < oldestYearMonth) {
        return current;
      }
      if (delta > 0 && next > forwardCap) return current;
      return next;
    });
  }

  const monthTransactions = useMemo(() => {
    return lifetimeMovements
      .filter((tx) => effectiveYearMonth(tx) === visibleYearMonth)
      .slice()
      .sort((a, b) => {
        if (a.occurredOn !== b.occurredOn) {
          return a.occurredOn < b.occurredOn ? 1 : -1;
        }
        return a.occurredAt < b.occurredAt ? 1 : -1;
      });
  }, [lifetimeMovements, visibleYearMonth]);

  const trend = useMemo(() => {
    const months: {
      month: string;
      label: string;
      expense: number;
      hasData: boolean;
    }[] = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const month = shiftYearMonth(yearMonth, -i);
      const hasData = oldestYearMonth !== null && month >= oldestYearMonth;
      let expense = 0;
      for (const tx of monthExpenseMovements(
        lifetimeMovements.filter((t) => effectiveYearMonth(t) === month),
      )) {
        expense += movementSpend(tx, settings.base_currency, ratesByDate) ?? 0;
      }
      months.push({
        month,
        label: format(parse(`${month}-01`, "yyyy-MM-dd", new Date()), "MMM"),
        expense,
        hasData,
      });
    }
    return months;
  }, [
    yearMonth,
    oldestYearMonth,
    lifetimeMovements,
    settings.base_currency,
    ratesByDate,
  ]);

  const hasAnyData = oldestYearMonth !== null;

  const trendMax = useMemo(
    () => Math.max(...trend.map((month) => month.expense), 0),
    [trend],
  );

  const topMerchants = useMemo(() => {
    const byMerchant = new Map<string, { total: number; count: number }>();
    for (const tx of monthExpenseMovements(monthTransactions)) {
      const label = tx.note?.trim();
      if (!label) continue;
      const value = movementSpend(tx, settings.base_currency, ratesByDate);
      if (value == null) continue;
      const entry = byMerchant.get(label) ?? { total: 0, count: 0 };
      entry.total += value;
      entry.count += 1;
      byMerchant.set(label, entry);
    }
    return Array.from(byMerchant.entries())
      .map(([label, { total, count }]) => ({ label, total, count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [monthTransactions, settings.base_currency, ratesByDate]);

  const recurringNotes = useMemo(
    () =>
      detectRecurringNotes(
        lifetimeMovements,
        `${visibleYearMonth}-01`,
        settings.base_currency,
        ratesByDate,
      ),
    [lifetimeMovements, visibleYearMonth, settings.base_currency, ratesByDate],
  );

  const timezone = useTimezone();
  const monthStats = useMemo(() => {
    const rows = monthExpenseMovements(monthTransactions);
    const { fixed, variable } = splitFixedVariable(
      rows,
      settings.fixed_labels,
      recurringNotes,
    );
    const variableExpense = periodTotals(
      variable,
      ALL_SOURCES,
      settings.base_currency,
      ratesByDate,
    ).expense;
    const fixedExpense = periodTotals(
      fixed,
      ALL_SOURCES,
      settings.base_currency,
      ratesByDate,
    ).expense;
    const expense = variableExpense + fixedExpense;

    const today = todayInTz(timezone);
    const [, end] = monthBounds(visibleYearMonth);
    const lastCounted = today < end ? today : end;
    const elapsedDays =
      lastCounted.slice(0, 7) === visibleYearMonth
        ? Number(lastCounted.slice(8, 10))
        : Number(end.slice(8, 10));
    return {
      expense,
      variableExpense,
      fixedExpense,
      avgPerDay: elapsedDays > 0 ? variableExpense / elapsedDays : 0,
    };
  }, [
    monthTransactions,
    settings.base_currency,
    settings.fixed_labels,
    recurringNotes,
    timezone,
    visibleYearMonth,
    ratesByDate,
  ]);

  const cashBalances = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const tx of lifetimeMovements) {
      for (const line of assetLines(tx, "manual")) {
        byCurrency.set(
          line.currency,
          (byCurrency.get(line.currency) ?? 0) + line.amount,
        );
      }
    }
    return Array.from(byCurrency.entries())
      .map(([currency, balance]) => ({ currency, balance }))
      .filter(({ balance }) => Math.abs(balance) >= 0.01)
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [lifetimeMovements]);

  const filteredList = useMemo(() => {
    let list: Movement[] = [];
    if (selectedTag !== null) {
      list = monthTransactions.filter((tx) =>
        tx.tags.length === 0
          ? selectedTag === UNTAGGED_LABEL
          : tx.tags.includes(selectedTag),
      );
    } else if (selectedPlace !== null) {
      list = monthTransactions;
    }
    return list;
  }, [monthTransactions, selectedTag, selectedPlace]);

  return {
    visibleYearMonth,
    setVisibleYearMonth,
    hasOlder,
    hasNewer,
    shiftMonth,
    monthTransactions,
    trend,
    trendMax,
    hasAnyData,
    topMerchants,
    monthExpense: monthStats.expense,
    avgPerDay: monthStats.avgPerDay,
    fixedExpense: monthStats.fixedExpense,
    recurringNotes,
    cashBalances,
    selectedTag,
    setSelectedTag,
    selectedPlace,
    setSelectedPlace,
    filteredList,
  };
}
