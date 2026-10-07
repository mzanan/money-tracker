import {
  cashWithdrawalSources,
  tabSourcesFrom,
  withoutArchived,
} from "@/lib/constants/sources";
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

export function initialSource(
  defaultSource: string | null,
  sources: string[],
  cashEnabled: boolean,
  archivedSources: ReadonlyArray<string> = [],
): string {
  if (!defaultSource || defaultSource === "all") return "all";
  return withoutArchived(
    tabSourcesFrom(sources, cashEnabled),
    archivedSources,
  ).includes(defaultSource)
    ? defaultSource
    : "all";
}

export interface ListFilterChoices {
  tags: string[];
  places: string[];
}

export function listFilterChoices(
  txs: ReadonlyArray<Transaction>,
  places: ReadonlyArray<Location>,
  selected: { tag: string | null; place: string | null } = {
    tag: null,
    place: null,
  },
): ListFilterChoices {
  const tags = new Set<string>();
  const placeNames = new Set<string>();
  if (selected.tag !== null) tags.add(selected.tag);
  if (selected.place !== null) placeNames.add(selected.place);
  for (const tx of txs) {
    if (tx.tags.length === 0) tags.add(UNTAGGED_LABEL);
    for (const tag of tx.tags) tags.add(tag);
    placeNames.add(placeOf(tx.occurred_on, places));
  }
  const byName = (a: string, b: string) => a.localeCompare(b);
  const sortedTags = Array.from(tags)
    .filter((tag) => tag !== UNTAGGED_LABEL)
    .sort(byName);
  if (tags.has(UNTAGGED_LABEL)) sortedTags.push(UNTAGGED_LABEL);
  return { tags: sortedTags, places: Array.from(placeNames).sort(byName) };
}

export function activeListFilterCount(
  tag: string | null,
  place: string | null,
): number {
  return (tag === null ? 0 : 1) + (place === null ? 0 : 1);
}

export function cashWithdrawalSourcesByUsage(
  sources: ReadonlyArray<string>,
  txs: ReadonlyArray<Transaction>,
): string[] {
  const counts = new Map<string, number>();
  for (const tx of txs) {
    counts.set(tx.source, (counts.get(tx.source) ?? 0) + 1);
  }
  return cashWithdrawalSources(sources).sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0),
  );
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
