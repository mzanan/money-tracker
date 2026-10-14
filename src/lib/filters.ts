import {
  cashWithdrawalSources,
  tabSourcesFrom,
  withoutArchived,
} from "@/lib/constants/sources";
import { UNTAGGED_LABEL } from "@/lib/constants/tags";
import { sourcesOf } from "@/lib/ledger/movements";
import {
  movementAmount,
  scopedDate,
  type MovementScope,
} from "@/lib/ledger/scope";
import { amountInCurrency } from "@/lib/ledger/valuation";
import { placeOf } from "@/lib/places";
import type { Location } from "@/types/db";
import type { Movement, RatesByDate } from "@/types/ledger";

export interface AmountRange {
  min?: number;
  max?: number;
}

export interface ListFilterOptions {
  kind: "all" | "income" | "expense";
  tag: string | null;
  place: string | null;
  places: ReadonlyArray<Location>;
  scope: MovementScope;
  baseCurrency: string;
  ratesByDate: RatesByDate;
}

export function initialSource(
  defaultSource: string | null,
  sources: string[],
  archivedSources: ReadonlyArray<string> = [],
): string {
  if (!defaultSource || defaultSource === "all") return "all";
  return withoutArchived(
    tabSourcesFrom(sources),
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
  movements: ReadonlyArray<Movement>,
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
  for (const movement of movements) {
    if (movement.tags.length === 0) tags.add(UNTAGGED_LABEL);
    for (const tag of movement.tags) tags.add(tag);
    placeNames.add(placeOf(movement.occurredOn, places));
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
  movements: ReadonlyArray<Movement>,
): string[] {
  const counts = new Map<string, number>();
  for (const movement of movements) {
    for (const source of sourcesOf(movement)) {
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }
  }
  return cashWithdrawalSources(sources).sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0),
  );
}

export function applyListFilters(
  movements: Movement[],
  {
    kind,
    tag,
    place,
    places,
    scope,
    baseCurrency,
    ratesByDate,
  }: ListFilterOptions,
): Movement[] {
  let list = movements;
  if (kind !== "all") {
    list = list.filter(
      (movement) =>
        movementAmount(movement, scope, baseCurrency, ratesByDate).kind ===
        kind,
    );
  }
  if (tag !== null) {
    list = list.filter((movement) =>
      movement.tags.length === 0
        ? tag === UNTAGGED_LABEL
        : movement.tags.includes(tag),
    );
  }
  if (place !== null) {
    list = list.filter(
      (movement) => placeOf(scopedDate(movement, scope), places) === place,
    );
  }
  return list;
}

export function filterByAmount(
  movements: Movement[],
  range: AmountRange,
  ctx: { scope: MovementScope; currency: string; ratesByDate: RatesByDate },
): Movement[] {
  const { min, max } = range;
  if (min == null && max == null) return movements;
  return movements.filter((movement) => {
    const value = amountInCurrency(
      movementAmount(movement, ctx.scope, ctx.currency, ctx.ratesByDate),
      ctx.currency,
      ctx.ratesByDate,
    );
    if (value === null) return false;
    if (min != null && value < min) return false;
    if (max != null && value > max) return false;
    return true;
  });
}
