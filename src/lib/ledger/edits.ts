import { kindOfSource } from "@/lib/constants/sources";
import { flowLines, type Money } from "@/lib/ledger/builders";
import { assetLines, isOwnMovement } from "@/lib/ledger/movements";
import type { LedgerDraft, PostingLine } from "@/lib/ledger/posting";
import type { ScaleOf } from "@/lib/ledger/scale";
import type { TransactionKind } from "@/types/db";
import type { Movement } from "@/types/ledger";

export function isSyncedMovement(movement: Movement): boolean {
  return assetLines(movement).some((line) => kindOfSource(line.key) === "api");
}

export function isWithdrawalMovement(movement: Movement): boolean {
  return movement.lines.some((line) => line.role === "withdrawal");
}

export function isTransferMovement(movement: Movement): boolean {
  return isOwnMovement(movement);
}

export function singleDate(draft: LedgerDraft): string | null {
  const dates = new Set(draft.lines.map((line) => line.occurredOn));
  return dates.size === 1 ? [...dates][0] : null;
}

export function withDate(draft: LedgerDraft, occurredOn: string): LedgerDraft {
  return {
    ...draft,
    occurredOn,
    lines: draft.lines.map((line) => ({ ...line, occurredOn })),
  };
}

export function withSource(
  draft: LedgerDraft,
  from: string,
  to: string,
): LedgerDraft {
  return {
    ...draft,
    lines: draft.lines.map((line) =>
      line.account.kind === "asset" && line.account.key === from
        ? { ...line, account: { ...line.account, key: to } }
        : line,
    ),
  };
}

export function withFlow(
  draft: LedgerDraft,
  flow: {
    kind: TransactionKind;
    source: string;
    money: Money;
    occurredOn: string;
  },
  scaleOf: ScaleOf,
): LedgerDraft {
  const fees: PostingLine[] = draft.lines
    .filter((line) => line.role === "fee")
    .map((line) => ({ ...line, occurredOn: flow.occurredOn }));
  return {
    ...draft,
    occurredOn: flow.occurredOn,
    lines: [...flowLines({ ...flow, scaleOf }), ...fees],
  };
}
