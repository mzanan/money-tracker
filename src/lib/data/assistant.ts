import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import { convert } from "@/lib/currency";
import { db } from "@/lib/db";
import { recurring_payments, transactions } from "@/lib/db/schema";
import { getRates } from "@/lib/rates";
import { dayTotalsList, periodTotals } from "@/lib/totals";
import type { TotalsBreakdown } from "@/lib/totals";
import type { Transaction, TransactionKind } from "@/types/db";

export interface DaySpend {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface TagTotal {
  tag: string;
  total: number;
  count: number;
}

export interface TransactionSummary {
  date: string;
  kind: TransactionKind;
  amount: number;
  amountOriginal: number;
  currencyOriginal: string;
  tags: string[];
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

export async function getTopTags(
  userId: string,
  baseCurrency: string,
  options: {
    from?: string;
    to?: string;
    kind?: TransactionKind;
    limit?: number;
  } = {},
): Promise<TagTotal[]> {
  const { from, to, kind = "expense", limit = 5 } = options;
  const txs = await fetchRange(userId, from, to);
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

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

export async function getTopMerchants(
  userId: string,
  baseCurrency: string,
  options: {
    from?: string;
    to?: string;
    limit?: number;
  } = {},
): Promise<MerchantTotal[]> {
  const { from, to, limit = 10 } = options;
  const txs = await fetchRange(userId, from, to);
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

export interface RecurringPaymentSummary {
  label: string;
  amount: number | null;
  currency: string | null;
  amountBase: number | null;
  monthlyBase: number | null;
  category: string | null;
  frequency: string;
  intervalMonths: number | null;
  nextDueOn: string;
  lastPaidOn: string | null;
}

const MONTHS_PER_FREQUENCY: Record<string, number> = {
  WEEKLY: 12 / 52,
  MONTHLY: 1,
  YEARLY: 12,
};

export async function getRecurringPayments(
  userId: string,
  baseCurrency: string,
): Promise<RecurringPaymentSummary[]> {
  const [reminders, rates] = await Promise.all([
    db
      .select()
      .from(recurring_payments)
      .where(eq(recurring_payments.user_id, userId))
      .orderBy(asc(recurring_payments.next_due_on)),
    getRates()
      .then((result) => result.rates)
      .catch(() => null),
  ]);

  return reminders.map((reminder) => {
    let amountBase: number | null = null;
    if (reminder.amount != null && reminder.currency && rates) {
      try {
        amountBase = convert(
          reminder.amount,
          reminder.currency,
          baseCurrency,
          rates,
        );
      } catch {
        amountBase = null;
      }
    }
    const monthsPerCycle =
      reminder.frequency === "CUSTOM_MONTHS"
        ? (reminder.interval_months ?? 1)
        : MONTHS_PER_FREQUENCY[reminder.frequency];
    const monthlyBase =
      amountBase != null && monthsPerCycle
        ? amountBase / monthsPerCycle
        : null;

    return {
      label: reminder.label,
      amount: reminder.amount,
      currency: reminder.currency,
      amountBase,
      monthlyBase,
      category: reminder.category,
      frequency: reminder.frequency,
      intervalMonths: reminder.interval_months,
      nextDueOn: reminder.next_due_on,
      lastPaidOn: reminder.last_paid_on,
    };
  });
}

export interface MonthTotal {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export async function getMonthlyTrend(
  userId: string,
  baseCurrency: string,
  months = 6,
): Promise<MonthTotal[]> {
  const txs = await fetchRange(userId);
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
