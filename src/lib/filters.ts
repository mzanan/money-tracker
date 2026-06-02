import { transactionInDisplay } from "@/lib/totals";
import type { DisplayMode } from "@/stores/uiStore";
import type { FxRates, Transaction } from "@/types/db";

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
  mode: DisplayMode,
  rates: FxRates | undefined,
): Transaction[] {
  const { min, max } = range;
  if (min == null && max == null) return txs;
  const out: Transaction[] = [];
  for (const tx of txs) {
    let value: number;
    try {
      value = Math.abs(
        transactionInDisplay(tx, displayCurrency, mode, rates),
      );
    } catch {
      continue;
    }
    if (min != null && value < min) continue;
    if (max != null && value > max) continue;
    out.push(tx);
  }
  return out;
}
