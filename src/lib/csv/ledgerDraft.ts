import type { CsvRow } from "@/lib/actions/csvImport";
import { isValidAmountForCurrency, roundForCurrency } from "@/lib/currency";
import { isValidCalendarDate } from "@/lib/dates";
import { CSV_FEE_SUFFIX, EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { isExactInMinor } from "@/lib/ledger/amounts";
import { feeLines, flowLines } from "@/lib/ledger/builders";
import { feeOnlyDraft } from "@/lib/ledger/edits";
import type { LedgerDraft } from "@/lib/ledger/posting";
import type { ScaleOf } from "@/lib/ledger/scale";
import { transactionContentHash } from "@/lib/transactions";

export interface CsvDraft {
  externalIds: string[];
  draft: LedgerDraft;
}

export function csvDraft(
  row: CsvRow,
  source: string,
  scaleOf: ScaleOf,
): CsvDraft | null {
  let scale: number;
  try {
    scale = scaleOf(row.currency);
  } catch {
    return null;
  }
  if (!isValidAmountForCurrency(row.amount, row.currency)) return null;
  const amount = roundForCurrency(row.amount, row.currency);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!isExactInMinor(amount, scale)) return null;
  const occurredOn = row.occurredOn.slice(0, 10);
  if (!isValidCalendarDate(occurredOn)) return null;

  const providedId = row.externalId?.trim();
  const externalId = providedId
    ? `${EXTERNAL_ID_PREFIX.csv}${providedId.toLowerCase().slice(0, 64)}`
    : transactionContentHash({ ...row, amount }).slice(0, 32);
  const money = { amount, currency: row.currency };
  const lines = flowLines({
    kind: row.kind,
    source,
    money,
    occurredOn,
    scaleOf,
  });
  const externalIds = [externalId];
  if (
    row.feeAmount &&
    row.feeAmount > 0 &&
    isValidAmountForCurrency(row.feeAmount, row.currency)
  ) {
    const fee = roundForCurrency(row.feeAmount, row.currency);
    if (fee > 0 && isExactInMinor(fee, scale)) {
      lines.push(
        ...feeLines(
          source,
          { amount: fee, currency: row.currency },
          occurredOn,
          scaleOf,
        ),
      );
      externalIds.push(`${externalId}${CSV_FEE_SUFFIX}`);
    }
  }
  return {
    externalIds,
    draft: {
      occurredOn,
      occurredAt: row.occurredAt ?? new Date().toISOString(),
      note: row.description?.trim() || null,
      comment: null,
      tags: [],
      recurringId: null,
      isFixed: null,
      budgetMonth: null,
      lines,
      externalRefs: externalIds.map((id) => ({
        origin: source,
        externalId: id,
      })),
    },
  };
}

const CSV_FEE_NOTE = "Wise fee";

export function uniqueCsvDrafts(drafts: ReadonlyArray<CsvDraft>): CsvDraft[] {
  const seen = new Set<string>();
  return drafts.filter(({ externalIds }) => {
    if (seen.has(externalIds[0])) return false;
    seen.add(externalIds[0]);
    return true;
  });
}

export function postableCsvDrafts(
  item: CsvDraft,
  taken: ReadonlySet<string>,
): LedgerDraft[] {
  const [mainId, feeId] = item.externalIds;
  const { draft } = item;
  const feeRefs = draft.externalRefs.filter((ref) => ref.externalId === feeId);
  if (taken.has(mainId)) {
    if (!feeId || taken.has(feeId)) return [];
    const fees = feeOnlyDraft(draft, CSV_FEE_NOTE);
    return fees ? [{ ...fees, externalRefs: feeRefs }] : [];
  }
  if (!feeId || !taken.has(feeId)) return [draft];
  return [
    {
      ...draft,
      lines: draft.lines.filter((line) => line.role !== "fee"),
      externalRefs: draft.externalRefs.filter(
        (ref) => ref.externalId !== feeId,
      ),
    },
  ];
}
