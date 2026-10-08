"use client";

import { useAccountCurrencies } from "@/hooks/useAccountCurrencies";
import { useSettings } from "@/hooks/useSettings";
import { accountDisplayCurrency } from "@/lib/accountCurrencies";
import { soleCurrencyOf } from "@/lib/totals";

import type { Transaction } from "@/types/db";

export function useDisplayCurrency(
  transactions: Pick<
    Transaction,
    "source" | "currency_original" | "fx_rates_snapshot"
  >[],
): string {
  const settings = useSettings();
  const accountCurrencies = useAccountCurrencies();
  return (
    accountDisplayCurrency(transactions, accountCurrencies) ??
    soleCurrencyOf(transactions) ??
    settings.base_currency
  );
}
