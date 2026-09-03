import { excludeCanceledPairs } from "@/lib/cancellations";
import { convert } from "@/lib/currency";
import { monthBounds } from "@/lib/dates";
import { splitFixedVariable } from "@/lib/fixedExpenses";
import { periodTotals } from "@/lib/totals";

import type { FxRates, RecurringPayment, Transaction } from "@/types/db";

export interface SpendProjection {
  variableDailyAverage: number;
  projectedVariable: number;
  fixedPaid: number;
  fixedUpcoming: number;
  fixedTotal: number;
  projectedTotal: number;
  recurringIncomplete: boolean;
}

export function monthElapsedTransactions(
  monthTransactions: Transaction[],
  today: string,
): Transaction[] {
  return excludeCanceledPairs(monthTransactions).filter(
    (tx) => tx.occurred_on <= today,
  );
}

export function monthScheduledFixed(
  monthTransactions: Transaction[],
  today: string,
  fixedLabels: string[],
  recurringNotes: Set<string>,
): Transaction[] {
  const upcoming = excludeCanceledPairs(monthTransactions).filter(
    (tx) => tx.occurred_on > today,
  );
  return splitFixedVariable(upcoming, fixedLabels, recurringNotes).fixed;
}

export function splitByMonthStart(
  txs: Transaction[],
  monthStart: string,
): { inMonth: Transaction[]; carried: Transaction[] } {
  const inMonth: Transaction[] = [];
  const carried: Transaction[] = [];
  for (const tx of txs) {
    if (tx.occurred_on >= monthStart) inMonth.push(tx);
    else carried.push(tx);
  }
  return { inMonth, carried };
}

export function computeSpendProjection({
  yearMonth,
  today,
  monthTransactions,
  unpaidRecurring,
  fixedLabels,
  recurringNotes,
  baseCurrency,
  rates,
}: {
  yearMonth: string;
  today: string;
  monthTransactions: Transaction[];
  unpaidRecurring: RecurringPayment[];
  fixedLabels: string[];
  recurringNotes: Set<string>;
  baseCurrency: string;
  rates: FxRates | null;
}): SpendProjection {
  const [monthStart, monthEnd] = monthBounds(yearMonth);
  const totalDaysInMonth = Number(monthEnd.slice(8, 10));
  const daysElapsed = Math.max(Number(today.slice(8, 10)), 1);

  const elapsed = monthElapsedTransactions(monthTransactions, today);
  const { fixed, variable } = splitFixedVariable(
    elapsed,
    fixedLabels,
    recurringNotes,
  );

  const { inMonth, carried } = splitByMonthStart(variable, monthStart);
  const inMonthVariable = periodTotals(inMonth, baseCurrency).expense;
  const carriedVariable = periodTotals(carried, baseCurrency).expense;
  const fixedPaid = periodTotals(fixed, baseCurrency).expense;

  const remainingDays = totalDaysInMonth - daysElapsed;
  const variableDailyAverage = inMonthVariable / daysElapsed;
  const projectedVariable =
    inMonthVariable + carriedVariable + variableDailyAverage * remainingDays;

  let recurringIncomplete = false;
  const fixedUpcoming = unpaidRecurring.reduce((sum, reminder) => {
    if (reminder.amount == null) return sum;
    const currency = reminder.currency ?? baseCurrency;
    if (currency === baseCurrency) return sum + reminder.amount;
    if (!rates) {
      recurringIncomplete = true;
      return sum;
    }
    try {
      return sum + convert(reminder.amount, currency, baseCurrency, rates);
    } catch {
      recurringIncomplete = true;
      return sum;
    }
  }, 0);

  const scheduledFixed = periodTotals(
    monthScheduledFixed(monthTransactions, today, fixedLabels, recurringNotes),
    baseCurrency,
  ).expense;

  const fixedTotal = fixedPaid + fixedUpcoming + scheduledFixed;
  const projectedTotal = projectedVariable + fixedTotal;

  return {
    variableDailyAverage,
    projectedVariable,
    fixedPaid,
    fixedUpcoming: fixedUpcoming + scheduledFixed,
    fixedTotal,
    projectedTotal,
    recurringIncomplete,
  };
}
