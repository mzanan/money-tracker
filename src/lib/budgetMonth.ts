import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";

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
