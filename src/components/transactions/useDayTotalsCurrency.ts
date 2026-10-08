"use client";

import { useAccountCurrencies } from "@/hooks/useAccountCurrencies";
import { useDayTotalsInAccount } from "@/hooks/useDayTotalsInAccount";
import { useSettings } from "@/hooks/useSettings";
import { accountDisplayCurrency } from "@/lib/accountCurrencies";
import { ALL_SOURCES } from "@/lib/constants/sources";

import type { Transaction } from "@/types/db";

export function useDayTotalsCurrency(
  selectedSource: string,
  transactions: Transaction[],
): string {
  const settings = useSettings();
  const accountCurrencies = useAccountCurrencies();
  const { dayTotalsInAccount } = useDayTotalsInAccount();
  if (!dayTotalsInAccount || selectedSource === ALL_SOURCES) {
    return settings.base_currency;
  }
  return (
    accountDisplayCurrency(transactions, accountCurrencies) ??
    settings.base_currency
  );
}
