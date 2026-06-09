import { transactionInDisplay } from "@/lib/totals";
import type { Transaction } from "@/types/db";

export interface AmountRange {
  min?: number;
  max?: number;
}

export function isAmountRangeActive(range: AmountRange): boolean {
  return range.min != null || range.max != null;
}

export function filterByAmount(
  txs: Transaction[],
  range: AmountRange,
  displayCurrency: string,
): Transaction[] {
  const { min, max } = range;
  if (min == null && max == null) return txs;
  const out: Transaction[] = [];
  for (const tx of txs) {
    let value: number;
    try {
      value = Math.abs(transactionInDisplay(tx, displayCurrency));
    } catch {
      continue;
    }
    if (min != null && value < min) continue;
    if (max != null && value > max) continue;
    out.push(tx);
  }
  return out;
}
