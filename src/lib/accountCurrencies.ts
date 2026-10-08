import { isSupportedCurrency } from "@/lib/constants/currencies";
import { kindOfSource } from "@/lib/constants/sources";
import type { Transaction } from "@/types/db";

export type AccountCurrencies = Record<string, string[]>;

export function parseAccountCurrencies(raw: string | null): string[] {
  if (!raw) return [];
  if (!raw.startsWith("[")) return [raw];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((code): code is string => typeof code === "string")
      : [];
  } catch {
    return [];
  }
}

export function serializeAccountCurrencies(codes: string[]): string | null {
  const unique = Array.from(new Set(codes));
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  return JSON.stringify(unique);
}

export function invalidAccountCurrencies(codes: unknown): boolean {
  return (
    !Array.isArray(codes) ||
    codes.some((code) => typeof code !== "string" || !isSupportedCurrency(code))
  );
}

export function declaredAccountCurrencies(
  rows: ReadonlyArray<{ source: string; currency: string | null }>,
): AccountCurrencies {
  const declared: AccountCurrencies = {};
  for (const row of rows) {
    const codes = parseAccountCurrencies(row.currency);
    if (codes.length > 0) declared[row.source] = codes;
  }
  return declared;
}

export function suggestedAccountCurrencies(
  usedRows: ReadonlyArray<{ source: string; currency: string }>,
): Record<string, string> {
  const seen = new Map<string, Set<string>>();
  for (const { source, currency } of usedRows) {
    if (kindOfSource(source) === "manual") continue;
    const set = seen.get(source) ?? new Set<string>();
    set.add(currency);
    seen.set(source, set);
  }
  const suggested: Record<string, string> = {};
  for (const [source, currencies] of seen) {
    if (currencies.size === 1) suggested[source] = [...currencies][0];
  }
  return suggested;
}

export function accountAccepts(
  allowed: string[] | undefined,
  currency: string,
): boolean {
  return !allowed || allowed.length === 0 || allowed.includes(currency);
}

export function accountCurrencyError({
  currency,
  allowed,
  accountLabel,
  side,
}: {
  currency: string;
  allowed: string[] | undefined;
  accountLabel: string;
  side: "sent" | "received" | "charged" | "own";
}): string | null {
  if (!allowed || accountAccepts(allowed, currency)) return null;
  if (side === "own") {
    return `${accountLabel} uses ${allowed.join(", ")}, but this transaction is in ${currency}.`;
  }
  const field = side === "charged" ? "the total charged" : `the amount ${side}`;
  return `${accountLabel} uses ${allowed.join(", ")}. Enter ${field} in ${allowed.join(" or ")}.`;
}

export function accountDisplayCurrency(
  transactions: ReadonlyArray<
    Pick<Transaction, "source" | "currency_original" | "fx_rates_snapshot">
  >,
  accountCurrencies: AccountCurrencies,
): string | null {
  const sources = new Set(transactions.map((tx) => tx.source));
  if (sources.size !== 1) return null;
  const declared = accountCurrencies[[...sources][0]];
  if (declared?.length !== 1) return null;
  const [currency] = declared;
  const convertible = transactions.every(
    (tx) =>
      tx.currency_original === currency ||
      Boolean(tx.fx_rates_snapshot?.[currency]),
  );
  return convertible ? currency : null;
}

export function toggleAccountCurrency(
  currencies: ReadonlyArray<string>,
  code: string,
): string[] {
  return currencies.includes(code)
    ? currencies.filter((current) => current !== code)
    : [...currencies, code];
}

export function accountCurrencySummary(
  declared: ReadonlyArray<string>,
): string {
  return declared.length > 0 ? declared.join(", ") : "Any currency";
}

export function currencyOptions(
  settingsCurrencies: ReadonlyArray<string>,
  declared: ReadonlyArray<string>,
): string[] {
  return Array.from(new Set([...settingsCurrencies, ...declared]));
}

export function preferredAccountCurrency(
  allowed: string[] | undefined,
  available: ReadonlyArray<string>,
  current?: string,
): string | null {
  if (current && allowed?.includes(current)) return current;
  return allowed?.find((code) => available.includes(code)) ?? null;
}
