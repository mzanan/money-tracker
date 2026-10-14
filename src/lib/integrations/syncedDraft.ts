import type { AbsorbRow } from "@/lib/absorb";
import type { NormalizedTx } from "@/lib/integrations";
import { fromMinor, toMinor } from "@/lib/ledger/amounts";
import { minorFlowLines } from "@/lib/ledger/builders";
import type { LedgerDraft } from "@/lib/ledger/posting";
import { normalizeTags } from "@/lib/transactions";

export interface SyncedDraft {
  id: string;
  externalId: string;
  draft: LedgerDraft;
  row: AbsorbRow;
}

export function syncedDraft(
  tx: NormalizedTx,
  provider: string,
  occurredOn: string,
  scale: number,
): SyncedDraft | null {
  const minor = toMinor(tx.amount, scale);
  if (minor <= 0) return null;
  const id = crypto.randomUUID();
  const note = tx.note?.trim() || null;
  const tags = normalizeTags(tx.tags);
  return {
    id,
    externalId: tx.externalId,
    draft: {
      occurredOn,
      occurredAt: tx.occurredAt,
      note,
      comment: null,
      tags,
      recurringId: null,
      isFixed: null,
      budgetMonth: null,
      lines: minorFlowLines({
        kind: tx.kind,
        source: provider,
        currency: tx.currency,
        minor,
        occurredOn,
      }),
      externalRefs: [{ origin: provider, externalId: tx.externalId }],
    },
    row: {
      id,
      kind: tx.kind,
      amount_original: fromMinor(minor, scale),
      currency_original: tx.currency,
      occurred_on: occurredOn,
      external_id: tx.externalId,
      note,
      comment: null,
      tags,
      is_fixed: null,
      recurring_id: null,
      budget_month: null,
    },
  };
}

export function freshSynced(
  drafts: ReadonlyArray<SyncedDraft>,
  taken: ReadonlySet<string>,
): SyncedDraft[] {
  const seen = new Set(taken);
  return drafts.filter(({ externalId }) => {
    if (seen.has(externalId)) return false;
    seen.add(externalId);
    return true;
  });
}
