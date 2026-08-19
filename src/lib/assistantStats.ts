import { convert } from "@/lib/currency";
import { periodTotals } from "@/lib/totals";
import type { Transaction, TransactionKind } from "@/types/db";

import type { TagTotal, TransactionSummary } from "@/lib/data/assistant";

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

function baseValue(tx: Transaction, baseCurrency: string): number | null {
  try {
    return convert(
      tx.amount_original,
      tx.currency_original,
      baseCurrency,
      tx.fx_rates_snapshot,
    );
  } catch {
    return null;
  }
}

export function topTags(
  txs: Transaction[],
  baseCurrency: string,
  options: { kind?: TransactionKind; limit?: number } = {},
): TagTotal[] {
  const { kind = "expense", limit = 5 } = options;
  const byTag = new Map<string, { total: number; count: number }>();
  for (const tx of txs) {
    if (tx.kind !== kind) continue;
    const value = baseValue(tx, baseCurrency);
    if (value === null) continue;
    const labels = tx.tags.length > 0 ? tx.tags : ["Untagged"];
    for (const label of labels) {
      const entry = byTag.get(label) ?? { total: 0, count: 0 };
      entry.total += value;
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
  txs: Transaction[],
  baseCurrency: string,
  limit = 10,
): MerchantTotal[] {
  const byMerchant = new Map<string, { total: number; count: number }>();
  for (const tx of txs) {
    if (tx.kind !== "expense") continue;
    const value = baseValue(tx, baseCurrency);
    if (value === null) continue;
    const label = tx.note?.trim() || "Unlabeled";
    const entry = byMerchant.get(label) ?? { total: 0, count: 0 };
    entry.total += value;
    entry.count += 1;
    byMerchant.set(label, entry);
  }
  return Array.from(byMerchant.entries())
    .map(([merchant, { total, count }]) => ({ merchant, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function monthlyTrend(
  txs: Transaction[],
  baseCurrency: string,
  months = 6,
): MonthTotal[] {
  const byMonth = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const month = tx.occurred_on.slice(0, 7);
    const list = byMonth.get(month) ?? [];
    list.push(tx);
    byMonth.set(month, list);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, months)
    .reverse()
    .map(([month, list]) => {
      const { income, expense, net } = periodTotals(list, baseCurrency);
      return { month, income, expense, net };
    });
}

export function filterTransactionSummaries(
  txs: Transaction[],
  baseCurrency: string,
  options: {
    query?: string;
    kind?: TransactionKind;
    limit?: number;
  } = {},
): TransactionSummary[] {
  const { query, kind, limit = 10 } = options;
  const needle = query?.trim().toLowerCase();
  const matches: TransactionSummary[] = [];
  for (const tx of txs) {
    if (kind && tx.kind !== kind) continue;
    if (needle) {
      const haystack = `${tx.note ?? ""} ${tx.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
    }
    matches.push({
      date: tx.occurred_on,
      kind: tx.kind,
      amount: baseValue(tx, baseCurrency) ?? tx.amount_original,
      amountOriginal: tx.amount_original,
      currencyOriginal: tx.currency_original,
      tags: tx.tags,
      note: tx.note,
      source: tx.source,
    });
    if (matches.length >= limit) break;
  }
  return matches;
}
