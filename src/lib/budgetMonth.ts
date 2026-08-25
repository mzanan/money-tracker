import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";

import type { DayTotalsWithPairs } from "@/lib/cancellations";
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

export interface CarriedOverGroup {
  month: string;
  transactions: Transaction[];
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
): CarriedOverGroup[] {
  const byMonth = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const month = tx.occurred_on.slice(0, 7);
    const list = byMonth.get(month) ?? [];
    list.push(tx);
    byMonth.set(month, list);
  }
  return Array.from(byMonth.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, txs]) => ({ month, transactions: txs }));
}

export function mergeMovedOutIntoDays(
  days: DayTotalsWithPairs[],
  movedOut: Transaction[],
): DayTotalsWithPairs[] {
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
