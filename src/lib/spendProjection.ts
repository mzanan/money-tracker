import { ALL_SOURCES } from "@/lib/constants/sources";
import { convert } from "@/lib/currency";
import { monthBounds, shiftYearMonth } from "@/lib/dates";
import {
  excludePaidReminders,
  matchesReminder,
  splitFixedVariable,
} from "@/lib/fixedExpenses";
import { excludeCanceledPairs } from "@/lib/ledger/canceledPairs";
import { periodTotals } from "@/lib/ledger/scope";

import type { FxRates, RecurringPayment } from "@/types/db";
import type { Movement, RatesByDate } from "@/types/ledger";

export interface SpendProjection {
  variableDailyAverage: number;
  projectedVariable: number;
  fixedPaid: number;
  fixedUpcoming: number;
  fixedScheduled: number;
  fixedTotal: number;
  projectedTotal: number;
  recurringIncomplete: boolean;
}

export function monthElapsedTransactions(
  monthTransactions: Movement[],
  today: string,
): Movement[] {
  return excludeCanceledPairs(monthTransactions).filter(
    (tx) => tx.occurredOn <= today,
  );
}

export const PROJECTION_OVERDUE_MONTHS = 1;

export function overdueUnpaidReminders({
  reminders,
  lifetimeMovements,
  yearMonth,
}: {
  reminders: RecurringPayment[];
  lifetimeMovements: Movement[];
  yearMonth: string;
}): RecurringPayment[] {
  const [, monthEnd] = monthBounds(yearMonth);
  const [overdueFrom] = monthBounds(
    shiftYearMonth(yearMonth, -PROJECTION_OVERDUE_MONTHS),
  );
  const dueInWindow = reminders.filter(
    (r) => r.next_due_on >= overdueFrom && r.next_due_on <= monthEnd,
  );
  const paymentHistory = excludeCanceledPairs(
    lifetimeMovements.filter(
      (tx) => tx.occurredOn >= overdueFrom && tx.occurredOn <= monthEnd,
    ),
  );
  return excludePaidReminders(dueInWindow, paymentHistory);
}

export function monthScheduledFixed(
  monthTransactions: Movement[],
  today: string,
  fixedLabels: string[],
  recurringNotes: Set<string>,
): Movement[] {
  const upcoming = excludeCanceledPairs(monthTransactions).filter(
    (tx) => tx.occurredOn > today,
  );
  return splitFixedVariable(upcoming, fixedLabels, recurringNotes).fixed;
}

export function splitByMonthStart(
  txs: Movement[],
  monthStart: string,
): { inMonth: Movement[]; carried: Movement[] } {
  const inMonth: Movement[] = [];
  const carried: Movement[] = [];
  for (const tx of txs) {
    if (tx.occurredOn >= monthStart) inMonth.push(tx);
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
  ratesByDate,
}: {
  yearMonth: string;
  today: string;
  monthTransactions: Movement[];
  unpaidRecurring: RecurringPayment[];
  fixedLabels: string[];
  recurringNotes: Set<string>;
  baseCurrency: string;
  rates: FxRates | null;
  ratesByDate: RatesByDate;
}): SpendProjection {
  const spent = (movements: Movement[]) =>
    periodTotals(movements, ALL_SOURCES, baseCurrency, ratesByDate).expense;
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
  const inMonthVariable = spent(inMonth);
  const carriedVariable = spent(carried);
  const fixedPaid = spent(fixed);

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

  const scheduledRows = monthScheduledFixed(
    monthTransactions,
    today,
    fixedLabels,
    recurringNotes,
  ).filter(
    (tx) => !unpaidRecurring.some((reminder) => matchesReminder(tx, reminder)),
  );
  const fixedScheduled = spent(scheduledRows);

  const fixedTotal = fixedPaid + fixedUpcoming + fixedScheduled;
  const projectedTotal = projectedVariable + fixedTotal;

  return {
    variableDailyAverage,
    projectedVariable,
    fixedPaid,
    fixedUpcoming,
    fixedScheduled,
    fixedTotal,
    projectedTotal,
    recurringIncomplete,
  };
}
