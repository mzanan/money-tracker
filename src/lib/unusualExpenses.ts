import { isFixedTransaction } from "@/lib/fixedExpenses";
import { monthExpenseRows, transactionInDisplay } from "@/lib/totals";

import type { Transaction } from "@/types/db";

export const UNUSUAL_MEDIAN_MULTIPLIER = 3;
export const UNUSUAL_MIN_SAMPLE = 5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function findUnusualExpenses(
  monthTransactions: Transaction[],
  fixedLabels: string[],
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
        isFixedTransaction(tx, fixedLabels) === false,
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(({ tx }) => tx);
}
