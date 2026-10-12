"use client";

import { useMemo } from "react";

import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useSettings } from "@/hooks/useSettings";
import {
  formatMoney,
  formatSignedOrNull,
  formatStat,
  isNegligible,
  signedBalance,
} from "@/lib/currency";
import { shiftYearMonth } from "@/lib/dates";
import { excludeCanceledPairs } from "@/lib/ledger/canceledPairs";
import { isAllScope, periodTotals, scopeBalance } from "@/lib/ledger/scope";

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
  const ratesByDate = useRatesByDate();
  const base = settings.base_currency;
  const displayCurrency = useDisplayCurrency(lifetimeMovements, scope);
  const showBase = displayCurrency !== base;
  const monthStart = `${yearMonth}-01`;
  const nextMonthStart = `${shiftYearMonth(yearMonth, 1)}-01`;

  const monthRows = useMemo(() => excludeCanceledPairs(movements), [movements]);

  const monthTotals = useMemo(
    () => periodTotals(monthRows, scope, displayCurrency, ratesByDate),
    [monthRows, scope, displayCurrency, ratesByDate],
  );
  const monthBase = useMemo(
    () => (showBase ? periodTotals(monthRows, scope, base, ratesByDate) : null),
    [showBase, monthRows, scope, base, ratesByDate],
  );

  const total = useMemo(
    () => scopeBalance(lifetimeMovements, scope, displayCurrency, ratesByDate),
    [lifetimeMovements, scope, displayCurrency, ratesByDate],
  );
  const totalBase = useMemo(
    () =>
      showBase
        ? scopeBalance(lifetimeMovements, scope, base, ratesByDate)
        : null,
    [showBase, lifetimeMovements, scope, base, ratesByDate],
  );

  const showOpening = !isAllScope(scope);
  const monthEdges = useMemo(
    () =>
      showOpening
        ? {
            opening: scopeBalance(
              lifetimeMovements,
              scope,
              displayCurrency,
              ratesByDate,
              monthStart,
            ),
            closing: scopeBalance(
              lifetimeMovements,
              scope,
              displayCurrency,
              ratesByDate,
              nextMonthStart,
            ),
          }
        : null,
    [
      showOpening,
      lifetimeMovements,
      scope,
      displayCurrency,
      ratesByDate,
      monthStart,
      nextMonthStart,
    ],
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
    opening: monthEdges && signedBalance(monthEdges.opening, displayCurrency),
    closing: monthEdges && signedBalance(monthEdges.closing, displayCurrency),
  };
}
