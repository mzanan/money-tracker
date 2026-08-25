"use client";

import { useMemo, useState } from "react";
import { format, parse } from "date-fns";

import { useSettings, useTimezone } from "@/hooks/useSettings";
import { todayInTz } from "@/lib/dates";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { UNTAGGED_LABEL } from "@/lib/constants/tags";
import {
  monthBounds,
  oldestYearMonthFrom,
  shiftYearMonth,
} from "@/lib/dates";
import { transactionInDisplay } from "@/lib/totals";

import type { Transaction } from "@/types/db";

const TREND_MONTHS = 6;

export function useDashboardView({
  yearMonth,
  lifetimeTransactions,
}: {
  yearMonth: string;
  lifetimeTransactions: Transaction[];
}) {
  const settings = useSettings();
  const [visibleYearMonth, setVisibleYearMonth] = useState(yearMonth);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);

  const oldestYearMonth = useMemo(
    () => oldestYearMonthFrom(lifetimeTransactions),
    [lifetimeTransactions],
  );
  const hasOlder =
    oldestYearMonth !== null &&
    shiftYearMonth(visibleYearMonth, -1) >= oldestYearMonth;
  const hasNewer = visibleYearMonth < yearMonth;

  function shiftMonth(delta: number) {
    setVisibleYearMonth((current) => {
      const next = shiftYearMonth(current, delta);
      if (delta < 0 && oldestYearMonth !== null && next < oldestYearMonth) {
        return current;
      }
      if (delta > 0 && next > yearMonth) return current;
      return next;
    });
  }

  const monthTransactions = useMemo(() => {
    const [start, end] = monthBounds(visibleYearMonth);
    return lifetimeTransactions
      .filter((tx) => tx.occurred_on >= start && tx.occurred_on <= end)
      .slice()
      .sort((a, b) => {
        if (a.occurred_on !== b.occurred_on) {
          return a.occurred_on < b.occurred_on ? 1 : -1;
        }
        return (a.occurred_at ?? "") < (b.occurred_at ?? "") ? 1 : -1;
      });
  }, [lifetimeTransactions, visibleYearMonth]);

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
      const [start, end] = monthBounds(month);
      let expense = 0;
      for (const tx of excludeCanceledPairs(
        lifetimeTransactions.filter(
          (t) => t.occurred_on >= start && t.occurred_on <= end,
        ),
      )) {
        if (tx.kind !== "expense" || tx.transfer_group) continue;
        try {
          expense += transactionInDisplay(tx, settings.base_currency);
        } catch {
          continue;
        }
      }
      months.push({
        month,
        label: format(parse(`${month}-01`, "yyyy-MM-dd", new Date()), "MMM"),
        expense,
        hasData,
      });
    }
    return months;
  }, [yearMonth, oldestYearMonth, lifetimeTransactions, settings.base_currency]);

  const hasAnyData = oldestYearMonth !== null;

  const trendMax = useMemo(
    () => Math.max(...trend.map((month) => month.expense), 0),
    [trend],
  );

  const topMerchants = useMemo(() => {
    const byMerchant = new Map<string, { total: number; count: number }>();
    for (const tx of excludeCanceledPairs(monthTransactions)) {
      if (tx.kind !== "expense" || tx.transfer_group) continue;
      const label = tx.note?.trim();
      if (!label) continue;
      let value: number;
      try {
        value = transactionInDisplay(tx, settings.base_currency);
      } catch {
        continue;
      }
      const entry = byMerchant.get(label) ?? { total: 0, count: 0 };
      entry.total += value;
      entry.count += 1;
      byMerchant.set(label, entry);
    }
    return Array.from(byMerchant.entries())
      .map(([label, { total, count }]) => ({ label, total, count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [monthTransactions, settings.base_currency]);

  const timezone = useTimezone();
  const monthStats = useMemo(() => {
    let expense = 0;
    for (const tx of excludeCanceledPairs(monthTransactions)) {
      if (tx.kind !== "expense" || tx.transfer_group) continue;
      try {
        expense += transactionInDisplay(tx, settings.base_currency);
      } catch {
        continue;
      }
    }
    const today = todayInTz(timezone);
    const [, end] = monthBounds(visibleYearMonth);
    const lastCounted = today < end ? today : end;
    const elapsedDays =
      lastCounted.slice(0, 7) === visibleYearMonth
        ? Number(lastCounted.slice(8, 10))
        : Number(end.slice(8, 10));
    return { expense, avgPerDay: elapsedDays > 0 ? expense / elapsedDays : 0 };
  }, [monthTransactions, settings.base_currency, timezone, visibleYearMonth]);

  const cashBalances = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const tx of lifetimeTransactions) {
      if (tx.source !== "manual") continue;
      const delta =
        tx.kind === "income" ? tx.amount_original : -tx.amount_original;
      byCurrency.set(
        tx.currency_original,
        (byCurrency.get(tx.currency_original) ?? 0) + delta,
      );
    }
    return Array.from(byCurrency.entries())
      .map(([currency, balance]) => ({ currency, balance }))
      .filter(({ balance }) => Math.abs(balance) >= 0.01)
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [lifetimeTransactions]);

  const filteredList = useMemo(() => {
    let list: Transaction[] = [];
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
    cashBalances,
    selectedTag,
    setSelectedTag,
    selectedPlace,
    setSelectedPlace,
    filteredList,
  };
}
