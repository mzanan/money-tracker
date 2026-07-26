import { dayDiff } from "@/lib/dates";
import { dayTotalsList } from "@/lib/totals";
import type { DayTotals } from "@/lib/totals";
import type { Transaction } from "@/types/db";

export const CANCELED_PAIR_WINDOW_DAYS = 14;

export interface CanceledPair {
  expense: Transaction;
  income: Transaction;
}

export interface DayTotalsWithPairs extends DayTotals {
  pairs: CanceledPair[];
}

export function splitCanceledPairs(
  transactions: Transaction[],
  windowDays = CANCELED_PAIR_WINDOW_DAYS,
): {
  pairs: CanceledPair[];
  rest: Transaction[];
} {
  const pairs: CanceledPair[] = [];
  const used = new Set<string>();
  const ordered = [...transactions].sort((a, b) =>
    a.occurred_on < b.occurred_on ? -1 : 1,
  );

  for (const tx of ordered) {
    if (tx.kind !== "expense" || used.has(tx.id)) continue;
    let refund: Transaction | undefined;
    let refundGap = Infinity;
    for (const other of ordered) {
      if (
        other.kind !== "income" ||
        used.has(other.id) ||
        other.source !== tx.source ||
        other.currency_original !== tx.currency_original ||
        Math.abs(other.amount_original - tx.amount_original) >= 0.001
      ) {
        continue;
      }
      const gap = Math.abs(dayDiff(other.occurred_on, tx.occurred_on));
      if (gap <= windowDays && gap < refundGap) {
        refund = other;
        refundGap = gap;
      }
    }
    if (!refund) continue;
    used.add(tx.id);
    used.add(refund.id);
    pairs.push({ expense: tx, income: refund });
  }

  return { pairs, rest: transactions.filter((tx) => !used.has(tx.id)) };
}

export function excludeCanceledPairs(
  transactions: Transaction[],
): Transaction[] {
  return splitCanceledPairs(transactions).rest;
}

export function dayTotalsWithPairs(
  transactions: Transaction[],
  displayCurrency: string,
  includeTransfers = false,
): DayTotalsWithPairs[] {
  const { pairs, rest } = splitCanceledPairs(transactions);
  const days: DayTotalsWithPairs[] = dayTotalsList(
    rest,
    displayCurrency,
    includeTransfers,
  ).map((day) => ({ ...day, pairs: [] }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const pair of pairs) {
    const date = pair.expense.occurred_on;
    let day = byDate.get(date);
    if (!day) {
      day = {
        date,
        transactions: [],
        income: 0,
        expense: 0,
        net: 0,
        pairs: [],
      };
      byDate.set(date, day);
      days.push(day);
    }
    day.pairs.push(pair);
  }
  return days.sort((a, b) => (a.date > b.date ? -1 : 1));
}
