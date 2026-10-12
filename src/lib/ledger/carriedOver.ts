import {
  splitCanceledPairsPreferring,
  type CanceledPair,
} from "@/lib/ledger/canceledPairs";
import {
  periodTotals,
  scopedYearMonth,
  type MovementScope,
  type TotalsBreakdown,
  type ValuationContext,
} from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

export interface CarriedOverGroup extends TotalsBreakdown {
  month: string;
  movements: Movement[];
  pairs: CanceledPair[];
}

export function hasBudgetMonthOverride(
  movement: Pick<Movement, "budgetMonth">,
): boolean {
  return movement.budgetMonth !== null;
}

export function partitionCarriedOver(movements: ReadonlyArray<Movement>): {
  native: Movement[];
  carriedOver: Movement[];
} {
  const native: Movement[] = [];
  const carriedOver: Movement[] = [];
  for (const movement of movements) {
    (hasBudgetMonthOverride(movement) ? carriedOver : native).push(movement);
  }
  return { native, carriedOver };
}

export interface CarriedOverSplit {
  pairs: CanceledPair[];
  native: Movement[];
  carriedOver: Movement[];
  displayOnly: Movement[];
}

export function splitCarriedOverPairs(
  native: Movement[],
  carriedOver: Movement[],
  displayOnly: Movement[] = [],
): CarriedOverSplit {
  const unchanged = { pairs: [], native, carriedOver, displayOnly };
  if (carriedOver.length === 0) return unchanged;
  const carriedIds = new Set(carriedOver.map((movement) => movement.id));
  const { pairs } = splitCanceledPairsPreferring(native, [
    ...carriedOver,
    ...displayOnly,
  ]);
  const crossed = pairs.filter(
    (pair) => carriedIds.has(pair.expense.id) || carriedIds.has(pair.income.id),
  );
  if (crossed.length === 0) return unchanged;
  const used = new Set(
    crossed.flatMap((pair) => [pair.expense.id, pair.income.id]),
  );
  return {
    pairs: crossed,
    native: native.filter((movement) => !used.has(movement.id)),
    carriedOver: carriedOver.filter((movement) => !used.has(movement.id)),
    displayOnly: displayOnly.filter((movement) => !used.has(movement.id)),
  };
}

export function groupCarriedOverByMonth(
  movements: ReadonlyArray<Movement>,
  ctx: ValuationContext,
  pairs: ReadonlyArray<CanceledPair> = [],
): CarriedOverGroup[] {
  const byMonth = new Map<
    string,
    { movements: Movement[]; pairs: CanceledPair[] }
  >();
  function bucket(month: string) {
    const existing = byMonth.get(month);
    if (existing) return existing;
    const created = { movements: [], pairs: [] };
    byMonth.set(month, created);
    return created;
  }
  for (const movement of movements) {
    bucket(scopedYearMonth(movement, ctx.scope)).movements.push(movement);
  }
  for (const pair of pairs) {
    const carried = hasBudgetMonthOverride(pair.expense)
      ? pair.expense
      : pair.income;
    bucket(scopedYearMonth(carried, ctx.scope)).pairs.push(pair);
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, group]) => ({
      month,
      movements: group.movements,
      pairs: group.pairs,
      ...periodTotals(
        group.movements,
        ctx.scope,
        ctx.currency,
        ctx.ratesByDate,
      ),
    }));
}

export function movedOutMovements(
  movements: ReadonlyArray<Movement>,
  scope: MovementScope,
  yearMonth: string,
): Movement[] {
  return movements.filter(
    (movement) =>
      hasBudgetMonthOverride(movement) &&
      scopedYearMonth(movement, scope) === yearMonth,
  );
}
