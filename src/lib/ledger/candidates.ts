import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { principalAssetLines, simpleFlow } from "@/lib/ledger/movements";
import type { CandidateMatch } from "@/lib/imageExtract";
import type { FlowCandidate, Movement } from "@/types/ledger";

export type { FlowCandidate };

export function flowCandidateOf(movement: Movement): FlowCandidate | null {
  const flow = simpleFlow(movement);
  if (!flow) return null;
  const [line] = principalAssetLines(movement);
  return {
    id: movement.id,
    kind: flow.kind,
    source: flow.source,
    amount: flow.amount,
    currency: flow.currency,
    occurredOn: line.occurredOn,
    occurredAt: movement.occurredAt,
    note: movement.note,
    recurringId: movement.recurringId,
    externalRefs: movement.externalRefs,
  };
}

export function hasReminderRef(candidate: FlowCandidate): boolean {
  return candidate.externalRefs.some((ref) =>
    ref.externalId.startsWith(EXTERNAL_ID_PREFIX.reminder),
  );
}

export function candidateMatchOf(candidate: FlowCandidate): CandidateMatch {
  return {
    id: candidate.id,
    source: candidate.source,
    occurredOn: candidate.occurredOn,
    amount: candidate.amount,
    currency: candidate.currency,
    kind: candidate.kind,
    note: candidate.note,
  };
}
