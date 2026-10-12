import { dayDiff } from "@/lib/dates";
import { simpleFlow } from "@/lib/ledger/movements";
import type { Movement, SimpleFlow } from "@/types/ledger";

export const CANCELED_PAIR_WINDOW_DAYS = 14;

export interface CanceledPair {
  expense: Movement;
  income: Movement;
  flow: SimpleFlow;
}

export function splitCanceledPairs(
  movements: ReadonlyArray<Movement>,
  windowDays = CANCELED_PAIR_WINDOW_DAYS,
): { pairs: CanceledPair[]; rest: Movement[] } {
  const pairs: CanceledPair[] = [];
  const used = new Set<string>();
  const flows = new Map<string, SimpleFlow>();
  for (const movement of movements) {
    const flow = simpleFlow(movement);
    if (flow) flows.set(movement.id, flow);
  }
  const ordered = movements
    .filter((movement) => flows.has(movement.id))
    .sort((a, b) => (a.occurredOn < b.occurredOn ? -1 : 1));

  for (const movement of ordered) {
    const flow = flows.get(movement.id)!;
    if (flow.kind !== "expense" || used.has(movement.id)) continue;
    let refund: Movement | undefined;
    let refundGap = Infinity;
    for (const other of ordered) {
      const otherFlow = flows.get(other.id)!;
      if (
        otherFlow.kind !== "income" ||
        used.has(other.id) ||
        otherFlow.source !== flow.source ||
        otherFlow.currency !== flow.currency ||
        Math.abs(otherFlow.amount - flow.amount) >= 0.001
      ) {
        continue;
      }
      const gap = Math.abs(dayDiff(other.occurredOn, movement.occurredOn));
      if (gap <= windowDays && gap < refundGap) {
        refund = other;
        refundGap = gap;
      }
    }
    if (!refund) continue;
    used.add(movement.id);
    used.add(refund.id);
    pairs.push({ expense: movement, income: refund, flow });
  }

  return {
    pairs,
    rest: movements.filter((movement) => !used.has(movement.id)),
  };
}

export function splitCanceledPairsPreferring(
  primary: ReadonlyArray<Movement>,
  extra: ReadonlyArray<Movement>,
): { pairs: CanceledPair[]; rest: Movement[] } {
  if (extra.length === 0) return splitCanceledPairs(primary);
  const internal = splitCanceledPairs(primary);
  const crossed = splitCanceledPairs([...internal.rest, ...extra]);
  return {
    pairs: [...internal.pairs, ...crossed.pairs],
    rest: crossed.rest,
  };
}

export function excludeCanceledPairs(
  movements: ReadonlyArray<Movement>,
): Movement[] {
  return splitCanceledPairs(movements).rest;
}

export function monthExpenseMovements(
  movements: ReadonlyArray<Movement>,
): Movement[] {
  return excludeCanceledPairs(movements).filter((movement) =>
    movement.lines.some((line) => line.kind === "expense"),
  );
}

export function pairedMovementIds(
  days: ReadonlyArray<{ pairs: ReadonlyArray<CanceledPair> }>,
): Set<string> {
  const ids = new Set<string>();
  for (const day of days) {
    for (const pair of day.pairs) {
      ids.add(pair.expense.id);
      ids.add(pair.income.id);
    }
  }
  return ids;
}
