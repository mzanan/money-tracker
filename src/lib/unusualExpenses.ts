import { monthExpenseRows } from "@/lib/cancellations";
import { effectiveYearMonth, shiftYearMonth } from "@/lib/dates";
import { isFixedTransaction, normalizeFixedLabel } from "@/lib/fixedExpenses";
import { transactionInDisplay } from "@/lib/totals";

import type { Transaction } from "@/types/db";

export const UNUSUAL_MEDIAN_MULTIPLIER = 3;
export const UNUSUAL_MIN_SAMPLE = 5;
export const UNUSUAL_LOOKBACK_MONTHS = 3;
export const UNUSUAL_RECURRING_MIN_MONTHS = 2;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function detectRecurringNotes(
  allTransactions: Transaction[],
  referenceDate: string,
): Set<string> {
  const currentMonth = referenceDate.slice(0, 7);
  const lookbackMonths = new Set(
    Array.from({ length: UNUSUAL_LOOKBACK_MONTHS }, (_, i) =>
      shiftYearMonth(currentMonth, -(i + 1)),
    ),
  );

  const earliestMonth = shiftYearMonth(
    currentMonth,
    -(UNUSUAL_LOOKBACK_MONTHS + 1),
  );
  const latestMonth = shiftYearMonth(currentMonth, 1);
  const windowed = allTransactions.filter((tx) => {
    const month = effectiveYearMonth(tx);
    return month >= earliestMonth && month <= latestMonth;
  });

  const monthsByNote = new Map<string, Set<string>>();
  for (const tx of monthExpenseRows(windowed)) {
    const normalized = normalizeFixedLabel(tx.note);
    if (normalized === "") continue;
    const month = effectiveYearMonth(tx);
    if (!lookbackMonths.has(month)) continue;
    const months = monthsByNote.get(normalized) ?? new Set<string>();
    months.add(month);
    monthsByNote.set(normalized, months);
  }

  const recurring = new Set<string>();
  for (const [note, months] of monthsByNote) {
    if (months.size >= UNUSUAL_RECURRING_MIN_MONTHS) recurring.add(note);
  }
  return recurring;
}

export function findUnusualExpenses(
  monthTransactions: Transaction[],
  fixedLabels: string[],
  recurringNotes: Set<string>,
  baseCurrency: string,
): Transaction[] {
  const valued: { tx: Transaction; value: number }[] = [];
  for (const tx of monthExpenseRows(monthTransactions)) {
    try {
      valued.push({ tx, value: transactionInDisplay(tx, baseCurrency) });
    } catch {
      continue;
    }
  }

  if (valued.length < UNUSUAL_MIN_SAMPLE) return [];

  const threshold =
    median(valued.map((row) => row.value)) * UNUSUAL_MEDIAN_MULTIPLIER;

  return valued
    .filter(
      ({ tx, value }) =>
        value >= threshold &&
        tx.is_fixed == null &&
        isFixedTransaction(tx, fixedLabels, recurringNotes) === false,
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(({ tx }) => tx);
}
