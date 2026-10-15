"use client";

import { pendingHint } from "@/lib/transactionDisplay";
import { useMemo } from "react";

import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import {
  formatMoney,
  formatSignedOrNull,
  formatStat,
  isNegligible,
  roundForDisplay,
} from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { excludeCanceledPairs } from "@/lib/ledger/canceledPairs";
import {
  isAllScope,
  linesInMonth,
  periodTotals,
  pendingIncoming,
  scopeBalance,
} from "@/lib/ledger/scope";

import type { MovementScope } from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

import { useDisplayCurrency } from "./useDisplayCurrency";

export function useBalanceHero({
  yearMonth,
  movements,
  lifetimeMovements,
  pendingMovements,
  scope,
}: {
  yearMonth: string;
  movements: Movement[];
  lifetimeMovements: Movement[];
  pendingMovements: Movement[];
  scope: MovementScope;
}) {
  const settings = useSettings();
  const timezone = useTimezone();
  const ratesByDate = useRatesByDate();
  const base = settings.base_currency;
  const displayCurrency = useDisplayCurrency(lifetimeMovements, scope);
  const showBase = displayCurrency !== base;
  const today = todayInTz(timezone);

  const accountScoped = !isAllScope(scope);
  const monthRows = useMemo(
    () =>
      excludeCanceledPairs(
        accountScoped ? linesInMonth(lifetimeMovements, yearMonth) : movements,
      ),
    [accountScoped, lifetimeMovements, movements, yearMonth],
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

  const pending = useMemo(
    () =>
      pendingIncoming(
        pendingMovements,
        scope,
        displayCurrency,
        ratesByDate,
        today,
      ),
    [pendingMovements, scope, displayCurrency, ratesByDate, today],
  );

  return {
    displayCurrency,
    pendingText: pendingHint(pending, displayCurrency),
    monthTotals,
    totalPositive: roundForDisplay(total, displayCurrency) >= 0,
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
