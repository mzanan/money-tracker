import { DEFAULT_BASE_CURRENCY } from "@/lib/constants/currencies";
import { MANUAL_SOURCE } from "@/lib/constants/sources";
import { isFeeExternalId } from "@/lib/externalIds";
import {
  assetLines,
  isOwnMovement,
  isPrincipalLine,
  primaryAssetLine,
} from "@/lib/ledger/movements";
import { isAllScope, scopedDate, type MovementScope } from "@/lib/ledger/scope";
import type { Movement, MovementLine, RowFacts } from "@/types/ledger";

function scopeLine(
  movement: Movement,
  scope: MovementScope,
): MovementLine | null {
  if (isAllScope(scope)) return primaryAssetLine(movement);
  const lines = assetLines(movement, scope);
  return lines.find(isPrincipalLine) ?? lines[0] ?? null;
}

export function rowFacts(movement: Movement, scope: MovementScope): RowFacts {
  const line = scopeLine(movement, scope);
  const source = line?.key ?? MANUAL_SOURCE;
  const ref = movement.externalRefs.find(
    (candidate) =>
      candidate.origin === source && !isFeeExternalId(candidate.externalId),
  );
  const isTransfer = isOwnMovement(movement);
  return {
    id: line?.legacyTxId ?? movement.id,
    movementId: movement.id,
    kind: (line?.amount ?? 0) >= 0 ? "income" : "expense",
    source,
    amount: Math.abs(line?.amount ?? 0),
    currency: line?.currency ?? DEFAULT_BASE_CURRENCY,
    note: movement.note,
    tags: movement.tags,
    occurredOn: scopedDate(movement, scope),
    budgetMonth: movement.budgetMonth,
    externalId: ref?.externalId ?? null,
    isTransfer,
    transferGroup: isTransfer ? (movement.leg?.movementId ?? movement.id) : null,
  };
}
