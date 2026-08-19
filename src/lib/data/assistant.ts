import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import {
  filterTransactionSummaries,
  monthlyTrend,
  topMerchants,
  topTags,
  type MerchantTotal,
  type MonthTotal,
  type TagTotal,
  type TransactionSummary,
} from "@/lib/assistantStats";
import { convert } from "@/lib/currency";
import { db } from "@/lib/db";
import { recurring_payments, transactions } from "@/lib/db/schema";
import { getRates } from "@/lib/rates";
import { monthsPerCycle } from "@/lib/reminders";
import { dayTotalsList, periodTotals } from "@/lib/totals";
import type { TotalsBreakdown } from "@/lib/totals";
import type { Transaction, TransactionKind } from "@/types/db";

export type {
  MerchantTotal,
  MonthTotal,
  TagTotal,
  TransactionSummary,
} from "@/lib/assistantStats";

export interface DaySpend {
  date: string;
  income: number;
  expense: number;
  net: number;
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
  const { from, to, ...statsOptions } = options;
  const txs = await fetchRange(userId, from, to);
  return topTags(txs, baseCurrency, statsOptions);
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
  const { from, to, limit } = options;
  const txs = await fetchRange(userId, from, to);
  return topMerchants(txs, baseCurrency, limit);
}

export interface RecurringPaymentSummary {
  label: string;
  amount: number | null;
  currency: string | null;
  amountBase: number | null;
  monthlyBase: number | null;
  frequency: string;
  intervalMonths: number | null;
  nextDueOn: string;
  lastPaidOn: string | null;
}

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
    const cycleMonths = monthsPerCycle(
      reminder.frequency,
      reminder.interval_months,
    );
    const monthlyBase = amountBase != null ? amountBase / cycleMonths : null;

    return {
      label: reminder.label,
      amount: reminder.amount,
      currency: reminder.currency,
      amountBase,
      monthlyBase,
      frequency: reminder.frequency,
      intervalMonths: reminder.interval_months,
      nextDueOn: reminder.next_due_on,
      lastPaidOn: reminder.last_paid_on,
    };
  });
}

export async function getMonthlyTrend(
  userId: string,
  baseCurrency: string,
  months = 6,
): Promise<MonthTotal[]> {
  const txs = await fetchRange(userId);
  return monthlyTrend(txs, baseCurrency, months);
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
  const { from, to, ...statsOptions } = options;
  const txs = await fetchRange(userId, from, to);
  return filterTransactionSummaries(txs, baseCurrency, statsOptions);
}
