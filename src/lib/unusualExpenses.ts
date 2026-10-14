import { effectiveYearMonth, shiftYearMonth } from "@/lib/dates";
import { isFixedTransaction, normalizeFixedLabel } from "@/lib/fixedExpenses";
import { monthExpenseMovements } from "@/lib/ledger/canceledPairs";
import { movementSpend } from "@/lib/ledger/valuation";

import type { Movement, RatesByDate } from "@/types/ledger";

export const UNUSUAL_MEDIAN_MULTIPLIER = 3;
export const UNUSUAL_MIN_SAMPLE = 5;
export const UNUSUAL_LOOKBACK_MONTHS = 3;
export const UNUSUAL_RECURRING_MIN_MONTHS = 2;
export const UNUSUAL_RECURRING_MAX_DAYS_PER_MONTH = 2;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function detectRecurringNotes(
  allMovements: Movement[],
  referenceDate: string,
  baseCurrency: string,
  ratesByDate: RatesByDate,
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
  const windowed = allMovements.filter((tx) => {
    const month = effectiveYearMonth(tx);
    return month >= earliestMonth && month <= latestMonth;
  });

  const daysByNoteAndMonth = new Map<string, Map<string, Set<string>>>();
  const valuesByNote = new Map<string, number[]>();
  const lookbackValues: number[] = [];
  for (const tx of monthExpenseMovements(windowed)) {
    const month = effectiveYearMonth(tx);
    if (!lookbackMonths.has(month)) continue;
    const value = movementSpend(tx, baseCurrency, ratesByDate);
    if (value == null) continue;
    lookbackValues.push(value);
    const normalized = normalizeFixedLabel(tx.note);
    if (normalized === "") continue;
    const byMonth =
      daysByNoteAndMonth.get(normalized) ?? new Map<string, Set<string>>();
    const days = byMonth.get(month) ?? new Set<string>();
    days.add(tx.occurredOn);
    byMonth.set(month, days);
    daysByNoteAndMonth.set(normalized, byMonth);
    valuesByNote.set(normalized, [
      ...(valuesByNote.get(normalized) ?? []),
      value,
    ]);
  }

  if (lookbackValues.length < UNUSUAL_MIN_SAMPLE) return new Set<string>();
  const threshold = median(lookbackValues) * UNUSUAL_MEDIAN_MULTIPLIER;

  const recurring = new Set<string>();
  for (const [note, byMonth] of daysByNoteAndMonth) {
    if (byMonth.size < UNUSUAL_RECURRING_MIN_MONTHS) continue;
    const sparseEveryMonth = Array.from(byMonth.values()).every(
      (days) => days.size <= UNUSUAL_RECURRING_MAX_DAYS_PER_MONTH,
    );
    if (!sparseEveryMonth) continue;
    if (median(valuesByNote.get(note) ?? []) < threshold) continue;
    recurring.add(note);
  }
  return recurring;
}

export function findUnusualExpenses(
  monthMovements: Movement[],
  fixedLabels: string[],
  recurringNotes: Set<string>,
  baseCurrency: string,
  ratesByDate: RatesByDate,
): Movement[] {
  const valued: { tx: Movement; value: number }[] = [];
  for (const tx of monthExpenseMovements(monthMovements)) {
    const value = movementSpend(tx, baseCurrency, ratesByDate);
    if (value !== null) valued.push({ tx, value });
  }

  if (valued.length < UNUSUAL_MIN_SAMPLE) return [];

  const threshold =
    median(valued.map((row) => row.value)) * UNUSUAL_MEDIAN_MULTIPLIER;

  return valued
    .filter(
      ({ tx, value }) =>
        value >= threshold &&
        tx.isFixed == null &&
        isFixedTransaction(tx, fixedLabels, recurringNotes) === false,
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(({ tx }) => tx);
}
