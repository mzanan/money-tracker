"use client";

import { useMemo } from "react";

import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import {
  formatMoney,
  formatSignedOrNull,
  formatStat,
  isNegligible,
} from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { excludeCanceledPairs } from "@/lib/ledger/canceledPairs";
import {
  isAllScope,
  linesInMonth,
  periodTotals,
  scopeBalance,
} from "@/lib/ledger/scope";

import type { MovementScope } from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

import { useDisplayCurrency } from "./useDisplayCurrency";

export function useBalanceHero({
  yearMonth,
  movements,
  lifetimeMovements,
  scope,
}: {
  yearMonth: string;
  movements: Movement[];
  lifetimeMovements: Movement[];
  scope: MovementScope;
}) {
  const settings = useSettings();
  const timezone = useTimezone();
  const ratesByDate = useRatesByDate();
  const base = settings.base_currency;
  const displayCurrency = useDisplayCurrency(lifetimeMovements, scope);
  const showBase = displayCurrency !== base;
  const today = todayInTz(timezone);

  const showOpening = !isAllScope(scope);
  const monthRows = useMemo(
    () =>
      excludeCanceledPairs(
        showOpening ? linesInMonth(lifetimeMovements, yearMonth) : movements,
      ),
    [showOpening, lifetimeMovements, movements, yearMonth],
  );

  const monthTotals = useMemo(
    () => periodTotals(monthRows, scope, displayCurrency, ratesByDate),
    [monthRows, scope, displayCurrency, ratesByDate],
  );
  const monthBase = useMemo(
    () => (showBase ? periodTotals(monthRows, scope, base, ratesByDate) : null),
    [showBase, monthRows, scope, base, ratesByDate],
  );

  const total = useMemo(
    () =>
      scopeBalance(
        lifetimeMovements,
        scope,
        displayCurrency,
        ratesByDate,
        today,
      ),
    [lifetimeMovements, scope, displayCurrency, ratesByDate, today],
  );
  const totalBase = useMemo(
    () =>
      showBase
        ? scopeBalance(lifetimeMovements, scope, base, ratesByDate, today)
        : null,
    [showBase, lifetimeMovements, scope, base, ratesByDate, today],
  );

  return {
    displayCurrency,
    monthTotals,
    totalPositive: total >= 0,
    totalSigned: formatMoney(total, displayCurrency, { signed: true }),
    showBase,
    totalInBase:
      totalBase === null ? null : formatSignedOrNull(totalBase, base),
    incomeInBase:
      monthBase && !isNegligible(monthBase.income)
        ? `+${formatStat(monthBase.income, base)}`
        : null,
    expenseInBase:
      monthBase && !isNegligible(monthBase.expense)
        ? `-${formatStat(monthBase.expense, base)}`
        : null,
    netInBase: monthBase ? formatSignedOrNull(monthBase.net, base) : null,
    monthPositive: monthTotals.net >= 0,
    monthSigned: formatMoney(monthTotals.net, displayCurrency, {
      signed: true,
    }),
  };
}
