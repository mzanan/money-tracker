import { excludeCanceledPairs } from "@/lib/cancellations";
import { convert } from "@/lib/currency";
import { monthBounds } from "@/lib/dates";
import { periodTotals } from "@/lib/totals";

import type { FxRates, RecurringPayment, Transaction } from "@/types/db";

export interface SpendProjection {
  dailyAverage: number;
  projectedTotal: number;
  projectedWithRecurring: number;
  recurringIncomplete: boolean;
}

export function computeSpendProjection({
  yearMonth,
  today,
  monthTransactions,
  unpaidRecurring,
  baseCurrency,
  rates,
}: {
  yearMonth: string;
  today: string;
  monthTransactions: Transaction[];
  unpaidRecurring: RecurringPayment[];
  baseCurrency: string;
  rates: FxRates | null;
}): SpendProjection {
  const [, monthEnd] = monthBounds(yearMonth);
  const totalDaysInMonth = Number(monthEnd.slice(8, 10));
  const daysElapsed = Math.max(Number(today.slice(8, 10)), 1);

  const spendSoFar = periodTotals(
    excludeCanceledPairs(monthTransactions).filter(
      (tx) => tx.occurred_on <= today,
    ),
    baseCurrency,
  ).expense;

  const dailyAverage = spendSoFar / daysElapsed;
  const projectedTotal = dailyAverage * totalDaysInMonth;

  let recurringIncomplete = false;
  const recurringRemaining = unpaidRecurring.reduce((sum, reminder) => {
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

  return {
    dailyAverage,
    projectedTotal,
    projectedWithRecurring: projectedTotal + recurringRemaining,
    recurringIncomplete,
  };
}
