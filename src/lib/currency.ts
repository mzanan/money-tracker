import { getCurrency } from "@/config/currencies";
import type { FxRates } from "@/types/db";

export function convert(
  amount: number,
  from: string,
  to: string,
  rates: FxRates,
): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) {
    throw new Error(`Missing rate for ${!fromRate ? from : to}`);
  }
  return (amount / fromRate) * toRate;
}

export function roundForCurrency(amount: number, code: string): number {
  const { decimals } = getCurrency(code);
  const factor = 10 ** decimals;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function isValidAmountForCurrency(
  amount: number,
  code: string,
): boolean {
  const { decimals } = getCurrency(code);
  return decimals > 0 || Number.isInteger(amount);
}

interface FormatOptions {
  showCode?: boolean;
  signed?: boolean;
}

export function formatMoney(
  amount: number,
  code: string,
  options: FormatOptions = {},
): string {
  const { decimals, symbol } = getCurrency(code);
  const abs = Math.abs(amount);
  const num = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(abs);
  const sign = amount < 0 ? "-" : options.signed ? "+" : "";
  const base = `${sign}${symbol}${num}`;
  return options.showCode ? `${base} ${code}` : base;
}

export function snapshotRatesFor(
  rates: FxRates,
  codes: Iterable<string>,
): FxRates {
  const out: FxRates = {};
  for (const code of codes) {
    if (rates[code] !== undefined) {
      out[code] = rates[code];
    }
  }
  // Rates are USD-based, so `convert` implicitly needs USD in the snapshot.
  if (rates.USD !== undefined) {
    out.USD = rates.USD;
  }
  return out;
}
