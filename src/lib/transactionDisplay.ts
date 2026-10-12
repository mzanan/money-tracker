import {
  resolveSourceLabel,
  type AccountLabels,
} from "@/lib/constants/sources";
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

export function exchangeText(sides: {
  sent: { amount: number; currency: string };
  received: { amount: number; currency: string };
}): string {
  return `${formatMoney(Math.abs(sides.sent.amount), sides.sent.currency)} → ${formatMoney(sides.received.amount, sides.received.currency)}`;
}

export function transferLabel(
  ends: { from: string; to: string },
  labels: AccountLabels,
  direction?: "sent" | "received",
): string {
  const route = `${resolveSourceLabel(ends.from, labels)} → ${resolveSourceLabel(ends.to, labels)}`;
  return direction ? `${route} (${direction})` : route;
}
