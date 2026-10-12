import {
  EXTERNAL_ID_PREFIX,
  transferFeeExternalId,
  transferFeeGroupFrom,
  withdrawalGroupFrom,
} from "@/lib/externalIds";

import type { Transaction } from "@/types/db";
import type { RowFacts } from "@/types/ledger";

type GroupShape = Pick<Transaction, "transfer_group" | "external_id">;

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

export function canShiftBudgetMonth(
  facts: Pick<RowFacts, "transferGroup" | "externalId">,
): boolean {
  return (
    budgetMonthGroupOf({
      transfer_group: facts.transferGroup,
      external_id: facts.externalId,
    }) !== null
  );
}

export function linkedExternalIds(group: string): string[] {
  return [
    `${EXTERNAL_ID_PREFIX.transfer}${group}`,
    transferFeeExternalId(group),
    transferFeeExternalId(group, "destination"),
    `${EXTERNAL_ID_PREFIX.withdrawal}${group}`,
    `${EXTERNAL_ID_PREFIX.withdrawal}${group}:out`,
    `${EXTERNAL_ID_PREFIX.withdrawal}${group}:in`,
  ];
}
