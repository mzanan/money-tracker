import { and, desc, eq, gte, lte } from "drizzle-orm";

import { convert } from "@/lib/currency";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { dayTotalsList, periodTotals } from "@/lib/totals";
import type { TotalsBreakdown } from "@/lib/totals";
import type { Transaction, TransactionKind } from "@/types/db";

export interface DaySpend {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface TransactionSummary {
  date: string;
  kind: TransactionKind;
  amount: number;
  amountOriginal: number;
  currencyOriginal: string;
  category: string | null;
  note: string | null;
  source: string;
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

function rangeWhere(userId: string, from?: string, to?: string) {
  const filters = [eq(transactions.user_id, userId)];
  if (from) filters.push(gte(transactions.occurred_on, from));
  if (to) filters.push(lte(transactions.occurred_on, to));
  return and(...filters);
}

async function fetchRange(
  userId: string,
  from?: string,
  to?: string,
): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(rangeWhere(userId, from, to))
    .orderBy(desc(transactions.occurred_on), desc(transactions.occurred_at));
}

export async function getBalance(
  userId: string,
  baseCurrency: string,
): Promise<TotalsBreakdown> {
  const txs = await fetchRange(userId);
  return periodTotals(txs, baseCurrency);
}

export async function getPeriodSummary(
  userId: string,
  baseCurrency: string,
  from: string,
  to: string,
): Promise<TotalsBreakdown> {
  const txs = await fetchRange(userId, from, to);
  return periodTotals(txs, baseCurrency);
}

export async function getDailySpend(
  userId: string,
  baseCurrency: string,
  from: string,
  to: string,
): Promise<DaySpend[]> {
  const txs = await fetchRange(userId, from, to);
  return dayTotalsList(txs, baseCurrency).map(
    ({ date, income, expense, net }) => ({ date, income, expense, net }),
  );
}

export async function getTopCategories(
  userId: string,
  baseCurrency: string,
  options: {
    from?: string;
    to?: string;
    kind?: TransactionKind;
    limit?: number;
  } = {},
): Promise<CategoryTotal[]> {
  const { from, to, kind = "expense", limit = 5 } = options;
  const txs = await fetchRange(userId, from, to);
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const tx of txs) {
    if (tx.kind !== kind) continue;
    const value = baseValue(tx, baseCurrency);
    if (value === null) continue;
    const label = tx.category?.trim() || "Uncategorized";
    const entry = byCategory.get(label) ?? { total: 0, count: 0 };
    entry.total += value;
    entry.count += 1;
    byCategory.set(label, entry);
  }
  return Array.from(byCategory.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function searchTransactions(
  userId: string,
  baseCurrency: string,
  options: {
    from?: string;
    to?: string;
    query?: string;
    kind?: TransactionKind;
    limit?: number;
  } = {},
): Promise<TransactionSummary[]> {
  const { from, to, query, kind, limit = 10 } = options;
  const txs = await fetchRange(userId, from, to);
  const needle = query?.trim().toLowerCase();
  const matches: TransactionSummary[] = [];
  for (const tx of txs) {
    if (kind && tx.kind !== kind) continue;
    if (needle) {
      const haystack = `${tx.note ?? ""} ${tx.category ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
    }
    matches.push({
      date: tx.occurred_on,
      kind: tx.kind,
      amount: baseValue(tx, baseCurrency) ?? tx.amount_original,
      amountOriginal: tx.amount_original,
      currencyOriginal: tx.currency_original,
      category: tx.category,
      note: tx.note,
      source: tx.source,
    });
    if (matches.length >= limit) break;
  }
  return matches;
}
