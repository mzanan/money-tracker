import { asc, eq } from "drizzle-orm";

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
import { recurring_payments } from "@/lib/db/schema";
import { getRates } from "@/lib/rates";
import { getLedgerData } from "@/lib/data/ledgerMovements";
import { ALL_SOURCES } from "@/lib/constants/sources";
import { todayInTz } from "@/lib/dates";
import { dayTotalsList } from "@/lib/ledger/days";
import { periodTotals } from "@/lib/ledger/scope";
import { monthsPerCycle } from "@/lib/reminders";
import type { TotalsBreakdown } from "@/lib/ledger/scope";
import type { StatsContext } from "@/lib/assistantStats";
import type { TransactionKind } from "@/types/db";
import type { Movement } from "@/types/ledger";

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

interface RangeData {
  movements: Movement[];
  ctx: StatsContext;
}

async function fetchRange(
  userId: string,
  baseCurrency: string,
  from?: string,
  to?: string,
): Promise<RangeData> {
  const { movements, ratesByDate } = await getLedgerData(
    userId,
    todayInTz("UTC"),
  );
  return {
    movements: movements.filter(
      (movement) =>
        (!from || movement.occurredOn >= from) &&
        (!to || movement.occurredOn <= to),
    ),
    ctx: { baseCurrency, ratesByDate },
  };
}

function totalsOf({ movements, ctx }: RangeData): TotalsBreakdown {
  return periodTotals(
    movements,
    ALL_SOURCES,
    ctx.baseCurrency,
    ctx.ratesByDate,
  );
}

export async function getBalance(
  userId: string,
  baseCurrency: string,
): Promise<TotalsBreakdown> {
  return totalsOf(await fetchRange(userId, baseCurrency));
}

export async function getPeriodSummary(
  userId: string,
  baseCurrency: string,
  from: string,
  to: string,
): Promise<TotalsBreakdown> {
  return totalsOf(await fetchRange(userId, baseCurrency, from, to));
}

export async function getDailySpend(
  userId: string,
  baseCurrency: string,
  from: string,
  to: string,
): Promise<DaySpend[]> {
  const { movements, ctx } = await fetchRange(userId, baseCurrency, from, to);
  return dayTotalsList(movements, {
    scope: ALL_SOURCES,
    currency: ctx.baseCurrency,
    ratesByDate: ctx.ratesByDate,
  }).map(({ date, income, expense, net }) => ({ date, income, expense, net }));
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
  const { movements, ctx } = await fetchRange(userId, baseCurrency, from, to);
  return topTags(movements, ctx, statsOptions);
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
  const { movements, ctx } = await fetchRange(userId, baseCurrency, from, to);
  return topMerchants(movements, ctx, limit);
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
  const { movements, ctx } = await fetchRange(userId, baseCurrency);
  return monthlyTrend(movements, ctx, months);
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
  const { movements, ctx } = await fetchRange(userId, baseCurrency, from, to);
  return filterTransactionSummaries(movements, ctx, statsOptions);
}
