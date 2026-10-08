"use client";

import { useMemo } from "react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { isSingleFundedSource } from "@/lib/costBasis";
import {
  formatConverted,
  formatMoney,
  formatSignedOrNull,
  formatStat,
  isNegligible,
} from "@/lib/currency";
import { periodTotals } from "@/lib/totals";

import type { Transaction } from "@/types/db";

import { useDisplayCurrency } from "./useDisplayCurrency";

export function useBalanceHero({
  transactions,
  lifetimeTransactions,
  includeTransfers,
  costBasisSources,
}: {
  transactions: Transaction[];
  lifetimeTransactions: Transaction[];
  includeTransfers: boolean;
  costBasisSources: string[];
}) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const base = settings.base_currency;
  const displayCurrency = useDisplayCurrency(lifetimeTransactions);
  const showBase = displayCurrency !== base;
  const atCost = isSingleFundedSource(lifetimeTransactions, costBasisSources);

  const monthRows = useMemo(
    () => excludeCanceledPairs(transactions),
    [transactions],
  );

  const monthTotals = useMemo(
    () => periodTotals(monthRows, displayCurrency, includeTransfers),
    [monthRows, displayCurrency, includeTransfers],
  );
  const monthBase = useMemo(
    () => (showBase ? periodTotals(monthRows, base, includeTransfers) : null),
    [showBase, monthRows, base, includeTransfers],
  );

  const lifetimeTotals = useMemo(
    () => periodTotals(lifetimeTransactions, displayCurrency, includeTransfers),
    [lifetimeTransactions, displayCurrency, includeTransfers],
  );
  const lifetimeAtCost = useMemo(
    () =>
      showBase && atCost
        ? periodTotals(lifetimeTransactions, base, includeTransfers).net
        : null,
    [showBase, atCost, lifetimeTransactions, base, includeTransfers],
  );

  const totalInBase =
    lifetimeAtCost !== null
      ? formatSignedOrNull(lifetimeAtCost, base)
      : showBase && !isNegligible(lifetimeTotals.net)
        ? formatConverted(
            lifetimeTotals.net,
            displayCurrency,
            base,
            ratesQuery.data?.rates,
            { signed: true },
          )
        : null;

  return {
    displayCurrency,
    monthTotals,
    totalPositive: lifetimeTotals.net >= 0,
    totalSigned: formatMoney(lifetimeTotals.net, displayCurrency, {
      signed: true,
    }),
    showBase,
    totalInBase,
    totalAtTodaysRate: lifetimeAtCost === null,
    ratesStale: ratesQuery.data?.stale ?? false,
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
