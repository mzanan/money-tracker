import { toInputDigits } from "@/lib/currency";
import type { TransactionKind } from "@/types/db";
import type { FlowFields } from "@/lib/schemas/transaction";

export interface FlowDraft {
  kind: TransactionKind;
  currency: string;
  amount: string;
}

export function flowDraftOf(seed: FlowFields): FlowDraft {
  return {
    kind: seed.kind,
    currency: seed.currency,
    amount: toInputDigits(seed.amount, seed.currency),
  };
}

export function flowEdited(seed: FlowDraft, draft: FlowDraft): boolean {
  return (
    seed.kind !== draft.kind ||
    seed.currency !== draft.currency ||
    seed.amount !== draft.amount
  );
}
