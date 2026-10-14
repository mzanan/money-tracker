import {
  pairedMovementIds,
  splitCanceledPairsPreferring,
  type CanceledPair,
} from "@/lib/ledger/canceledPairs";
import {
  periodTotals,
  scopedDate,
  type MovementScope,
  type TotalsBreakdown,
  type ValuationContext,
} from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

export interface DayTotals extends TotalsBreakdown {
  date: string;
  movements: Movement[];
  pairs: CanceledPair[];
}

export function dayTotalsList(
  movements: ReadonlyArray<Movement>,
  ctx: ValuationContext,
): DayTotals[] {
  const byDay = new Map<string, Movement[]>();
  for (const movement of movements) {
    const date = scopedDate(movement, ctx.scope);
    const list = byDay.get(date);
    if (list) list.push(movement);
    else byDay.set(date, [movement]);
  }
  return [...byDay.keys()]
    .sort((a, b) => (a > b ? -1 : 1))
    .map((date) => {
      const dayMovements = byDay.get(date)!;
      return {
        date,
        movements: dayMovements,
        pairs: [],
        ...periodTotals(dayMovements, ctx.scope, ctx.currency, ctx.ratesByDate),
      };
    });
}

function emptyDay(date: string): DayTotals {
  return { date, movements: [], income: 0, expense: 0, net: 0, pairs: [] };
}

export function dayTotalsWithPairs(
  movements: ReadonlyArray<Movement>,
  ctx: ValuationContext,
  pairingOnly: ReadonlyArray<Movement> = [],
): DayTotals[] {
  const { pairs, rest } = splitCanceledPairsPreferring(movements, pairingOnly);
  const pairingIds = new Set(pairingOnly.map((movement) => movement.id));
  const counted =
    pairingIds.size === 0
      ? rest
      : rest.filter((movement) => !pairingIds.has(movement.id));
  const days = dayTotalsList(counted, ctx);
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const pair of pairs) {
    const date = scopedDate(pair.expense, ctx.scope);
    let day = byDate.get(date);
    if (!day) {
      day = emptyDay(date);
      byDate.set(date, day);
      days.push(day);
    }
    day.pairs.push(pair);
  }
  return days.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function mergeMovedOutIntoDays(
  days: DayTotals[],
  displayOnly: ReadonlyArray<Movement>,
  scope: MovementScope,
): DayTotals[] {
  const paired = pairedMovementIds(days);
  const movedOut =
    paired.size === 0
      ? displayOnly
      : displayOnly.filter((movement) => !paired.has(movement.id));
  if (movedOut.length === 0) return days;
  const byDate = new Map(
    days.map((day) => [day.date, { ...day, movements: [...day.movements] }]),
  );
  for (const movement of movedOut) {
    const date = scopedDate(movement, scope);
    const existing = byDate.get(date);
    if (existing) existing.movements.push(movement);
    else byDate.set(date, { ...emptyDay(date), movements: [movement] });
  }
  return [...byDate.values()].sort((a, b) => (a.date > b.date ? -1 : 1));
}
