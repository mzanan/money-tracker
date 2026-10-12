import { DEFAULT_BASE_CURRENCY } from "@/lib/constants/currencies";
import { MANUAL_SOURCE } from "@/lib/constants/sources";
import { CSV_FEE_SUFFIX, EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import {
  assetLines,
  isFeeLine,
  isOwnMovement,
  primaryAssetLine,
} from "@/lib/ledger/movements";
import { isAllScope, scopedDate, type MovementScope } from "@/lib/ledger/scope";
import type { Movement, MovementLine, RowFacts } from "@/types/ledger";

function isFeeExternalId(externalId: string): boolean {
  return (
    externalId.startsWith(EXTERNAL_ID_PREFIX.transferFee) ||
    externalId.startsWith(EXTERNAL_ID_PREFIX.manualFee) ||
    externalId.endsWith(CSV_FEE_SUFFIX)
  );
}

function feeLegacyIds(movement: Movement): Set<string> {
  return new Set(
    movement.lines.flatMap((line) =>
      isFeeLine(line) && line.legacyTxId !== null ? [line.legacyTxId] : [],
    ),
  );
}

function scopeLine(
  movement: Movement,
  scope: MovementScope,
): MovementLine | null {
  if (isAllScope(scope)) return primaryAssetLine(movement);
  const fees = feeLegacyIds(movement);
  const lines = assetLines(movement, scope);
  return (
    lines.find(
      (line) => line.legacyTxId === null || !fees.has(line.legacyTxId),
    ) ??
    lines[0] ??
    null
  );
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
    transferGroup: isTransfer ? movement.id : null,
  };
}
