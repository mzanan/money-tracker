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

export function transitBannerTitle(count: number): string {
  return count === 1
    ? "1 transfer in transit"
    : `${count} transfers in transit`;
}

export function transferBadgeLabel(
  isWithdrawal: boolean,
  inTransit: boolean,
): string {
  if (isWithdrawal) return "Withdrawal";
  return inTransit ? "In transit" : "Transfer";
}

export function pendingHint(amount: number, currency: string): string | null {
  return amount > 0 ? `+${formatMoney(amount, currency)} pending` : null;
}

export function transitBannerDetail(amountText: string, route: string): string {
  return `${amountText} · ${route}`;
}

export function transferToast(
  amount: number,
  currency: string,
  inTransit: boolean,
): string {
  return `${inTransit ? "In transit" : "Transfer"} · ${formatMoney(amount, currency)}`;
}
