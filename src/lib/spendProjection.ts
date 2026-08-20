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

export function computeSpendProjection({
  yearMonth,
  today,
  monthTransactions,
  unpaidRecurring,
  fixedLabels,
  baseCurrency,
  rates,
}: {
  yearMonth: string;
  today: string;
  monthTransactions: Transaction[];
  unpaidRecurring: RecurringPayment[];
  fixedLabels: string[];
  baseCurrency: string;
  rates: FxRates | null;
}): SpendProjection {
  const [, monthEnd] = monthBounds(yearMonth);
  const totalDaysInMonth = Number(monthEnd.slice(8, 10));
  const daysElapsed = Math.max(Number(today.slice(8, 10)), 1);

  const elapsed = excludeCanceledPairs(monthTransactions).filter(
    (tx) => tx.occurred_on <= today,
  );
  const { fixed, variable } = splitFixedVariable(elapsed, fixedLabels);

  const variableSpendSoFar = periodTotals(variable, baseCurrency).expense;
  const fixedPaid = periodTotals(fixed, baseCurrency).expense;

  const variableDailyAverage = variableSpendSoFar / daysElapsed;
  const projectedVariable = variableDailyAverage * totalDaysInMonth;

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

  const fixedTotal = fixedPaid + fixedUpcoming;
  const projectedTotal = projectedVariable + fixedTotal;

  return {
    variableDailyAverage,
    projectedVariable,
    fixedPaid,
    fixedUpcoming,
    fixedTotal,
    projectedTotal,
    recurringIncomplete,
  };
}
