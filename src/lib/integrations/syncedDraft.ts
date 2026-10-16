import type { AbsorbRow } from "@/lib/absorb";
import type { NormalizedTx } from "@/lib/integrations";
import { fromMinor, toMinor } from "@/lib/ledger/amounts";
import { minorFlowLines, transferPosting } from "@/lib/ledger/builders";
import type { LedgerDraft, PostingLine } from "@/lib/ledger/posting";
import type { ScaleOf } from "@/lib/ledger/scale";
import { normalizeTags } from "@/lib/transactions";

export interface SyncedDraft {
  id: string;
  externalId: string;
  draft: LedgerDraft;
  row: AbsorbRow;
  absorbable: boolean;
}

function roundedTo(amount: number, currency: string, scaleOf: ScaleOf): number {
  const scale = scaleOf(currency);
  return fromMinor(toMinor(amount, scale), scale);
}

function syncedLines(
  tx: NormalizedTx,
  provider: string,
  occurredOn: string,
  minor: number,
  scaleOf: ScaleOf,
): PostingLine[] | null {
  if (!tx.exchange) {
    return minorFlowLines({
      kind: tx.kind,
      source: provider,
      currency: tx.currency,
      minor,
      occurredOn,
    });
  }
  const { sent, received } = tx.exchange;
  const receivedAmount = roundedTo(received.amount, received.currency, scaleOf);
  if (receivedAmount <= 0 || sent.currency === received.currency) return null;
  return transferPosting({
    origin: provider,
    destination: provider,
    sent: {
      amount: roundedTo(sent.amount, sent.currency, scaleOf),
      currency: sent.currency,
    },
    received: { amount: receivedAmount, currency: received.currency },
    originFee: 0,
    destinationFee: 0,
    sentOn: occurredOn,
    receivedOn: occurredOn,
    scaleOf,
  });
}

export function syncedDraft(
  tx: NormalizedTx,
  provider: string,
  occurredOn: string,
  scaleOf: ScaleOf,
): SyncedDraft | null {
  const scale = scaleOf(tx.currency);
  const minor = toMinor(tx.amount, scale);
  if (minor <= 0) return null;
  const lines = syncedLines(tx, provider, occurredOn, minor, scaleOf);
  if (!lines) return null;
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
      lines,
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
    absorbable: !tx.exchange,
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
