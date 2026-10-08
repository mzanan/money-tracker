import { formatMoney } from "@/lib/currency";

export const ESTIMATE_PREFIX = "≈ ";

export function rowAmountTexts({
  amount,
  currency,
  baseAmount,
  baseCurrency,
  accountFirst,
}: {
  amount: number;
  currency: string;
  baseAmount: number | null;
  baseCurrency: string;
  accountFirst: boolean;
}): { primary: string; secondary: string | null } {
  const original = formatMoney(amount, currency);
  if (baseAmount === null) return { primary: original, secondary: null };
  const base = formatMoney(baseAmount, baseCurrency);
  if (currency === baseCurrency) return { primary: base, secondary: null };
  return accountFirst
    ? { primary: original, secondary: `${ESTIMATE_PREFIX}${base}` }
    : { primary: base, secondary: original };
}
