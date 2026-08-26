import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";

import {
  pairedTransactionIds,
  splitCanceledPairsPreferring,
} from "@/lib/cancellations";
import { periodTotals } from "@/lib/totals";

import type { CanceledPair, DayTotalsWithPairs } from "@/lib/cancellations";
import type { TotalsBreakdown } from "@/lib/totals";
import type { Transaction } from "@/types/db";

type GroupShape = Pick<Transaction, "transfer_group" | "external_id">;

function withdrawalGroupFrom(externalId: string | null): string | null {
  if (!externalId?.startsWith(EXTERNAL_ID_PREFIX.withdrawal)) return null;
  const rest = externalId.slice(EXTERNAL_ID_PREFIX.withdrawal.length);
  const group = rest.split(":")[0];
  return group || null;
}

function transferFeeGroupFrom(externalId: string | null): string | null {
  if (!externalId?.startsWith(EXTERNAL_ID_PREFIX.transferFee)) return null;
  const group = externalId.slice(EXTERNAL_ID_PREFIX.transferFee.length);
  return group || null;
}

function isExchangeExternalId(externalId: string | null): boolean {
  return externalId?.startsWith(EXTERNAL_ID_PREFIX.exchange) ?? false;
}

export const BUDGET_MONTH_LOCK_ERROR =
  "Move this transaction back to its real month first";

export function budgetMonthGroupOf(tx: GroupShape): string | null {
  if (isExchangeExternalId(tx.external_id)) return null;
  return (
    tx.transfer_group ??
    withdrawalGroupFrom(tx.external_id) ??
    transferFeeGroupFrom(tx.external_id)
  );
}

export function canShiftBudgetMonth(tx: GroupShape): boolean {
  return budgetMonthGroupOf(tx) !== null;
}

export function linkedExternalIds(group: string): string[] {
  return [
    `${EXTERNAL_ID_PREFIX.transfer}${group}`,
    `${EXTERNAL_ID_PREFIX.transferFee}${group}`,
    `${EXTERNAL_ID_PREFIX.withdrawal}${group}`,
    `${EXTERNAL_ID_PREFIX.withdrawal}${group}:out`,
    `${EXTERNAL_ID_PREFIX.withdrawal}${group}:in`,
  ];
}

export interface CarriedOverGroup extends TotalsBreakdown {
  month: string;
  transactions: Transaction[];
  pairs: CanceledPair[];
}

export interface CarriedOverSplit {
  pairs: CanceledPair[];
  native: Transaction[];
  carriedOver: Transaction[];
  displayOnly: Transaction[];
}

export function splitCarriedOverPairs(
  native: Transaction[],
  carriedOver: Transaction[],
  displayOnly: Transaction[] = [],
): CarriedOverSplit {
  const unchanged = { pairs: [], native, carriedOver, displayOnly };
  if (carriedOver.length === 0) return unchanged;
  const carriedIds = new Set(carriedOver.map((tx) => tx.id));
  const { pairs } = splitCanceledPairsPreferring(native, [
    ...carriedOver,
    ...displayOnly,
  ]);
  const crossed = pairs.filter(
    (pair) =>
      carriedIds.has(pair.expense.id) || carriedIds.has(pair.income.id),
  );
  if (crossed.length === 0) return unchanged;
  const used = new Set(
    crossed.flatMap((pair) => [pair.expense.id, pair.income.id]),
  );
  return {
    pairs: crossed,
    native: native.filter((tx) => !used.has(tx.id)),
    carriedOver: carriedOver.filter((tx) => !used.has(tx.id)),
    displayOnly: displayOnly.filter((tx) => !used.has(tx.id)),
  };
}

export function hasBudgetMonthOverride(
  tx: Pick<Transaction, "budget_month">,
): boolean {
  return tx.budget_month !== null;
}

export function partitionCarriedOver(transactions: Transaction[]): {
  native: Transaction[];
  carriedOver: Transaction[];
} {
  const native: Transaction[] = [];
  const carriedOver: Transaction[] = [];
  for (const tx of transactions) {
    (hasBudgetMonthOverride(tx) ? carriedOver : native).push(tx);
  }
  return { native, carriedOver };
}

export function groupCarriedOverByMonth(
  transactions: Transaction[],
  displayCurrency: string,
  includeTransfers = false,
  pairs: CanceledPair[] = [],
): CarriedOverGroup[] {
  const byMonth = new Map<
    string,
    { transactions: Transaction[]; pairs: CanceledPair[] }
  >();
  function bucket(month: string) {
    const existing = byMonth.get(month);
    if (existing) return existing;
    const created = { transactions: [], pairs: [] };
    byMonth.set(month, created);
    return created;
  }
  for (const tx of transactions) {
    bucket(tx.occurred_on.slice(0, 7)).transactions.push(tx);
  }
  for (const pair of pairs) {
    const carried = hasBudgetMonthOverride(pair.expense)
      ? pair.expense
      : pair.income;
    bucket(carried.occurred_on.slice(0, 7)).pairs.push(pair);
  }
  return Array.from(byMonth.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, group]) => ({
      month,
      transactions: group.transactions,
      pairs: group.pairs,
      ...periodTotals(group.transactions, displayCurrency, includeTransfers),
    }));
}

export function mergeMovedOutIntoDays(
  days: DayTotalsWithPairs[],
  displayOnly: Transaction[],
): DayTotalsWithPairs[] {
  const paired = pairedTransactionIds(days);
  const movedOut =
    paired.size === 0
      ? displayOnly
      : displayOnly.filter((tx) => !paired.has(tx.id));
  if (movedOut.length === 0) return days;
  const byDate = new Map(
    days.map((day) => [
      day.date,
      { ...day, transactions: [...day.transactions] },
    ]),
  );
  for (const tx of movedOut) {
    const date = tx.occurred_on;
    const existing = byDate.get(date);
    if (existing) {
      existing.transactions.push(tx);
    } else {
      byDate.set(date, {
        date,
        transactions: [tx],
        income: 0,
        expense: 0,
        net: 0,
        pairs: [],
      });
    }
  }
  return Array.from(byDate.values()).sort((a, b) => (a.date > b.date ? -1 : 1));
}
