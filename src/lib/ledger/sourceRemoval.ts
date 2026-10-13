import { isWithdrawalMovement, splitTransfer } from "@/lib/ledger/edits";
import { sourcesOf } from "@/lib/ledger/movements";
import type { LedgerDraft } from "@/lib/ledger/posting";
import {
  bankWithdrawalLine,
  withdrawalGroupOf,
  withoutCashLeg,
} from "@/lib/ledger/withdrawals";
import type { Movement } from "@/types/ledger";

function touches(draft: LedgerDraft, source: string): boolean {
  return draft.lines.some(
    (line) => line.account.kind === "asset" && line.account.key === source,
  );
}

export function draftsWithoutSource(
  record: { movement: Movement; draft: LedgerDraft },
  source: string,
): LedgerDraft[] {
  const { movement, draft } = record;
  if (sourcesOf(movement).every((key) => key === source)) return [];
  if (isWithdrawalMovement(movement)) {
    const bank = bankWithdrawalLine(draft);
    const group = withdrawalGroupOf(draft);
    if (!bank || !group || bank.account.key === source) return [];
    const kept = withoutCashLeg(draft, group);
    return touches(kept, source) ? [] : [kept];
  }
  return splitTransfer(draft)
    .filter((part) => !touches(part, source))
    .map((part) => ({
      ...part,
      externalRefs: part.externalRefs.filter((ref) => ref.origin !== source),
    }));
}
