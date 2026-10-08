"use client";

import { useMemo } from "react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { formatConverted, formatMoney } from "@/lib/currency";
import { periodTotals } from "@/lib/totals";

import type { Transaction } from "@/types/db";

import { useDisplayCurrency } from "./useDisplayCurrency";

export function useBalanceHero({
  transactions,
  lifetimeTransactions,
  includeTransfers,
}: {
  transactions: Transaction[];
  lifetimeTransactions: Transaction[];
  includeTransfers: boolean;
}) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const displayCurrency = useDisplayCurrency(lifetimeTransactions);

  const monthTotals = useMemo(
    () =>
      periodTotals(
        excludeCanceledPairs(transactions),
        displayCurrency,
        includeTransfers,
      ),
    [transactions, displayCurrency, includeTransfers],
  );

  const lifetimeTotals = useMemo(
    () => periodTotals(lifetimeTransactions, displayCurrency, includeTransfers),
    [lifetimeTransactions, displayCurrency, includeTransfers],
  );

  return {
    displayCurrency,
    monthTotals,
    totalPositive: lifetimeTotals.net >= 0,
    totalSigned: formatMoney(lifetimeTotals.net, displayCurrency, {
      signed: true,
    }),
    showBaseEstimate: displayCurrency !== settings.base_currency,
    totalInBase: formatConverted(
      lifetimeTotals.net,
      displayCurrency,
      settings.base_currency,
      ratesQuery.data?.rates,
      { signed: true },
    ),
    ratesStale: ratesQuery.data?.stale ?? false,
    monthPositive: monthTotals.net >= 0,
    monthSigned: formatMoney(monthTotals.net, displayCurrency, {
      signed: true,
    }),
  };
}
