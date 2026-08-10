import { getCurrency } from "@/lib/constants/currencies";
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

export function amountValidationError(
  amount: number,
  code: string,
): string | null {
  return isValidAmountForCurrency(amount, code)
    ? null
    : `${code} has no decimals. Enter a whole number.`;
}

export function feeAmountError(
  fee: number,
  code: string,
  legAmount?: number,
): string | null {
  const amountError = amountValidationError(fee, code);
  if (amountError) return amountError;
  if (legAmount !== undefined && fee >= legAmount) {
    return "Fee must be less than the amount";
  }
  return null;
}

export function parseAmountInput(value: string): number | null {
  const num = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function parseAndRoundAmount(
  raw: string,
  code: string,
): { ok: true; amount: number } | { ok: false; error: string } {
  const numericAmount = parseAmountInput(raw);
  if (numericAmount === null) {
    return { ok: false, error: "Enter an amount" };
  }
  const error = amountValidationError(numericAmount, code);
  if (error) {
    return { ok: false, error };
  }
  return { ok: true, amount: roundForCurrency(numericAmount, code) };
}

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}

export function sanitizeAmountDigits(raw: string, decimals: number): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (decimals === 0) {
    const firstDot = cleaned.indexOf(".");
    const integerOnly = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot);
    return stripLeadingZeros(integerOnly);
  }

  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return stripLeadingZeros(cleaned);

  const integerPart = stripLeadingZeros(cleaned.slice(0, firstDot));
  const decimalPart = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, "")
    .slice(0, decimals);
  return `${integerPart}.${decimalPart}`;
}

export function formatAmountDisplay(raw: string): string {
  if (!raw) return "";
  const [integerPart, decimalPart] = raw.split(".");
  const formattedInteger = integerPart
    ? Number(integerPart).toLocaleString("en-US")
    : "";
  return decimalPart !== undefined
    ? `${formattedInteger}.${decimalPart}`
    : formattedInteger;
}

export function countSignificantAmountChars(text: string, upTo: number): number {
  let count = 0;
  for (let i = 0; i < upTo && i < text.length; i++) {
    if (/[\d.]/.test(text[i])) count++;
  }
  return count;
}

export function positionAfterSignificantAmountChars(
  text: string,
  target: number,
): number {
  if (target <= 0) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (/[\d.]/.test(text[i])) {
      count++;
      if (count === target) return i + 1;
    }
  }
  return text.length;
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

export function toUsdPair(
  a: { amount: number; currency: string },
  b: { amount: number; currency: string },
  rates: FxRates | null,
): { usdA: number; usdB: number } | null {
  if (a.currency === b.currency) return { usdA: a.amount, usdB: b.amount };
  const rateA = rates?.[a.currency];
  const rateB = rates?.[b.currency];
  if (!rateA || !rateB) return null;
  return { usdA: a.amount / rateA, usdB: b.amount / rateB };
}

export function relativeUsdDiff(usdA: number, usdB: number): number | null {
  const reference = Math.max(usdA, usdB);
  if (reference <= 0) return null;
  return Math.abs(usdA - usdB) / reference;
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
