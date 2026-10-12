import { ALL_SOURCES, MANUAL_SOURCE } from "@/lib/constants/sources";
import { effectiveYearMonth } from "@/lib/dates";
import { primaryAssetLine } from "@/lib/ledger/movements";
import { UNTAGGED_LABEL } from "@/lib/constants/tags";
import { movementAmount, periodTotals } from "@/lib/ledger/scope";
import { amountInCurrency } from "@/lib/ledger/valuation";
import type { TransactionKind } from "@/types/db";
import type { FlowKind, Movement, RatesByDate } from "@/types/ledger";

export interface TagTotal {
  tag: string;
  total: number;
  count: number;
}

export interface TransactionSummary {
  date: string;
  kind: FlowKind;
  amount: number;
  amountOriginal: number;
  currencyOriginal: string;
  tags: string[];
  note: string | null;
  source: string;
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

export interface MonthTotal {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface StatsContext {
  baseCurrency: string;
  ratesByDate: RatesByDate;
}

function shownAmount(movement: Movement, ctx: StatsContext) {
  const shown = movementAmount(
    movement,
    ALL_SOURCES,
    ctx.baseCurrency,
    ctx.ratesByDate,
  );
  return {
    shown,
    base: amountInCurrency(shown, ctx.baseCurrency, ctx.ratesByDate),
  };
}

export function topTags(
  movements: Movement[],
  ctx: StatsContext,
  options: { kind?: TransactionKind; limit?: number } = {},
): TagTotal[] {
  const { kind = "expense", limit = 5 } = options;
  const byTag = new Map<string, { total: number; count: number }>();
  for (const movement of movements) {
    const { shown, base } = shownAmount(movement, ctx);
    if (shown.kind !== kind || base === null) continue;
    const labels = movement.tags.length > 0 ? movement.tags : [UNTAGGED_LABEL];
    for (const label of labels) {
      const entry = byTag.get(label) ?? { total: 0, count: 0 };
      entry.total += base;
      entry.count += 1;
      byTag.set(label, entry);
    }
  }
  return Array.from(byTag.entries())
    .map(([tag, { total, count }]) => ({ tag, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function topMerchants(
  movements: Movement[],
  ctx: StatsContext,
  limit = 10,
): MerchantTotal[] {
  const byMerchant = new Map<string, { total: number; count: number }>();
  for (const movement of movements) {
    const { shown, base } = shownAmount(movement, ctx);
    if (shown.kind !== "expense" || base === null) continue;
    const label = movement.note?.trim() || "Unlabeled";
    const entry = byMerchant.get(label) ?? { total: 0, count: 0 };
    entry.total += base;
    entry.count += 1;
    byMerchant.set(label, entry);
  }
  return Array.from(byMerchant.entries())
    .map(([merchant, { total, count }]) => ({ merchant, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function monthlyTrend(
  movements: Movement[],
  ctx: StatsContext,
  months = 6,
): MonthTotal[] {
  const byMonth = new Map<string, Movement[]>();
  for (const movement of movements) {
    const month = effectiveYearMonth(movement);
    const list = byMonth.get(month) ?? [];
    list.push(movement);
    byMonth.set(month, list);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, months)
    .reverse()
    .map(([month, list]) => {
      const { income, expense, net } = periodTotals(
        list,
        ALL_SOURCES,
        ctx.baseCurrency,
        ctx.ratesByDate,
      );
      return { month, income, expense, net };
    });
}

export function filterTransactionSummaries(
  movements: Movement[],
  ctx: StatsContext,
  options: {
    query?: string;
    kind?: TransactionKind;
    limit?: number;
  } = {},
): TransactionSummary[] {
  const { query, kind, limit = 10 } = options;
  const needle = query?.trim().toLowerCase();
  const matches: TransactionSummary[] = [];
  for (const movement of movements) {
    const { shown, base } = shownAmount(movement, ctx);
    if (kind && shown.kind !== kind) continue;
    if (needle) {
      const haystack =
        `${movement.note ?? ""} ${movement.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
    }
    matches.push({
      date: movement.occurredOn,
      kind: shown.kind,
      amount: base ?? shown.amount,
      amountOriginal: shown.amount,
      currencyOriginal: shown.currency,
      tags: movement.tags,
      note: movement.note,
      source: primaryAssetLine(movement)?.key ?? MANUAL_SOURCE,
    });
    if (matches.length >= limit) break;
  }
  return matches;
}
