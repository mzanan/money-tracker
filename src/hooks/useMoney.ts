"use client";

import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { formatMoney, type FormatOptions } from "@/lib/currency";

interface MoneyOptions extends FormatOptions {
  currency?: string;
}

export function useMoney() {
  const settings = useSettings();
  const { mask } = useHideAmounts();

  return function money(
    value: number,
    { currency = settings.base_currency, ...options }: MoneyOptions = {},
  ): string {
    return mask(formatMoney(value, currency, options));
  };
}
