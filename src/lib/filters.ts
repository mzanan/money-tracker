import { UNTAGGED_LABEL } from "@/lib/constants/tags";
import { placeOf } from "@/lib/places";
import { transactionInDisplay } from "@/lib/totals";
import type { Location, Transaction } from "@/types/db";

export interface AmountRange {
  min?: number;
  max?: number;
}

export interface ListFilterOptions {
  kind: "all" | "income" | "expense";
  tag: string | null;
  place: string | null;
  places: ReadonlyArray<Location>;
}

export function applyListFilters(
  txs: Transaction[],
  { kind, tag, place, places }: ListFilterOptions,
): Transaction[] {
  let list = txs;
  if (kind !== "all") {
    list = list.filter((tx) => tx.kind === kind);
  }
  if (tag !== null) {
    list = list.filter((tx) =>
      tx.tags.length === 0 ? tag === UNTAGGED_LABEL : tx.tags.includes(tag),
    );
  }
  if (place !== null) {
    list = list.filter((tx) => placeOf(tx.occurred_on, places) === place);
  }
  return list;
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
