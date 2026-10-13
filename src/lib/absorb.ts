import { dayWindow } from "@/lib/dates";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { flowCandidateOf } from "@/lib/ledger/candidates";
import type { LedgerDraft } from "@/lib/ledger/posting";
import { feeOnlyDraft } from "@/lib/ledger/edits";
import { manualFeeNote, normalizeTags } from "@/lib/transactions";
import type { FlowCandidate, Movement } from "@/types/ledger";

const ABSORB_WINDOW_DAYS = 2;
const ABSORB_AMOUNT_TOLERANCE = 0.01;
const ABSORB_REMINDER_TOLERANCE_PCT = 0.05;

export interface AbsorbRow {
  id: string;
  kind: "income" | "expense";
  amount_original: number;
  currency_original: string;
  occurred_on: string;
  external_id: string | null;
  note: string | null;
  comment: string | null;
  tags: string[];
  is_fixed: boolean | null;
  recurring_id: string | null;
  budget_month: string | null;
}

export type AbsorbPatch = Partial<
  Pick<
    AbsorbRow,
    "note" | "comment" | "tags" | "is_fixed" | "recurring_id" | "budget_month"
  >
>;

export interface AbsorbMatch {
  syncedId: string;
  absorbedId: string;
  patch: AbsorbPatch;
}

function isReminderRow(row: AbsorbRow): boolean {
  return row.external_id?.startsWith(EXTERNAL_ID_PREFIX.reminder) ?? false;
}

function candidatesFor(synced: AbsorbRow, pool: AbsorbRow[]): AbsorbRow[] {
  const { start, end } = dayWindow(synced.occurred_on, ABSORB_WINDOW_DAYS);
  const base = pool.filter(
    (row) =>
      row.kind === synced.kind &&
      row.currency_original === synced.currency_original &&
      row.occurred_on >= start &&
      row.occurred_on <= end,
  );
  const diff = (row: AbsorbRow) =>
    Math.abs(row.amount_original - synced.amount_original);
  const exact = base.filter((row) => diff(row) <= ABSORB_AMOUNT_TOLERANCE);
  if (exact.length > 0) return exact;
  const tolerance =
    Math.abs(synced.amount_original) * ABSORB_REMINDER_TOLERANCE_PCT;
  return base.filter((row) => isReminderRow(row) && diff(row) <= tolerance);
}

export function absorbPatch(synced: AbsorbRow, match: AbsorbRow): AbsorbPatch {
  const patch: AbsorbPatch = {};
  if (!synced.comment && match.comment) patch.comment = match.comment;
  if (!synced.note && match.note) patch.note = match.note;
  const tags = normalizeTags([...synced.tags, ...match.tags]);
  if (tags.length !== synced.tags.length) patch.tags = tags;
  if (synced.is_fixed === null && match.is_fixed !== null) {
    patch.is_fixed = match.is_fixed;
  }
  if (!synced.recurring_id && match.recurring_id) {
    patch.recurring_id = match.recurring_id;
  }
  if (!synced.budget_month && match.budget_month) {
    patch.budget_month = match.budget_month;
  }
  return patch;
}

export function findAbsorbMatches(
  synced: AbsorbRow[],
  candidates: AbsorbRow[],
): AbsorbMatch[] {
  const pool = [...candidates];
  const matches: AbsorbMatch[] = [];
  for (const row of synced) {
    const found = candidatesFor(row, pool);
    if (found.length !== 1) continue;
    const match = found[0];
    pool.splice(pool.indexOf(match), 1);
    matches.push({
      syncedId: row.id,
      absorbedId: match.id,
      patch: absorbPatch(row, match),
    });
  }
  return matches;
}

export function absorbDateRange(rows: AbsorbRow[]): {
  start: string;
  end: string;
} {
  const days = rows.map((row) => row.occurred_on).sort();
  return {
    start: dayWindow(days[0], ABSORB_WINDOW_DAYS).start,
    end: dayWindow(days[days.length - 1], ABSORB_WINDOW_DAYS).end,
  };
}

export function isAbsorbableRef(externalId: string): boolean {
  return (
    externalId.startsWith(EXTERNAL_ID_PREFIX.reminder) ||
    externalId.startsWith(EXTERNAL_ID_PREFIX.screenshot)
  );
}

export function absorbRowOf(
  movement: Movement,
  candidate: FlowCandidate,
): AbsorbRow {
  return {
    id: movement.id,
    kind: candidate.kind,
    amount_original: candidate.amount,
    currency_original: candidate.currency,
    occurred_on: candidate.occurredOn,
    external_id: movement.externalRefs[0]?.externalId ?? null,
    note: movement.note,
    comment: movement.comment,
    tags: movement.tags,
    is_fixed: movement.isFixed,
    recurring_id: movement.recurringId,
    budget_month: movement.budgetMonth,
  };
}

export function withAbsorbPatch(
  draft: LedgerDraft,
  patch: AbsorbPatch,
): LedgerDraft {
  return {
    ...draft,
    note: patch.note !== undefined ? patch.note : draft.note,
    comment: patch.comment !== undefined ? patch.comment : draft.comment,
    tags: patch.tags ?? draft.tags,
    isFixed: patch.is_fixed !== undefined ? patch.is_fixed : draft.isFixed,
    recurringId:
      patch.recurring_id !== undefined ? patch.recurring_id : draft.recurringId,
    budgetMonth:
      patch.budget_month !== undefined ? patch.budget_month : draft.budgetMonth,
  };
}

export function absorbPool(
  movements: ReadonlyArray<Movement>,
  syncSource: string,
): AbsorbRow[] {
  return movements.flatMap((movement) => {
    const candidate = flowCandidateOf(movement);
    if (!candidate || candidate.source === syncSource) return [];
    if (
      !movement.externalRefs.every((ref) => isAbsorbableRef(ref.externalId))
    ) {
      return [];
    }
    return [absorbRowOf(movement, candidate)];
  });
}

export interface AbsorbPlan {
  writes: Array<{ id: string; draft: LedgerDraft }>;
  absorbedIds: string[];
  feeDrafts: LedgerDraft[];
}

export function absorbPlan(
  synced: ReadonlyArray<{ id: string; draft: LedgerDraft; row: AbsorbRow }>,
  records: ReadonlyArray<{ movement: Movement; draft: LedgerDraft }>,
  syncSource: string,
): AbsorbPlan {
  const byId = new Map(records.map((record) => [record.movement.id, record]));
  const matches = findAbsorbMatches(
    synced.map(({ row }) => row),
    absorbPool(
      records.map(({ movement }) => movement),
      syncSource,
    ),
  );
  const patches = new Map(
    matches.map((match) => [match.syncedId, match.patch]),
  );
  const absorbed = matches.flatMap((match) => {
    const record = byId.get(match.absorbedId);
    return record ? [record] : [];
  });
  return {
    writes: synced.map(({ id, draft }) => {
      const patch = patches.get(id);
      return { id, draft: patch ? withAbsorbPatch(draft, patch) : draft };
    }),
    absorbedIds: absorbed.map(({ movement }) => movement.id),
    feeDrafts: absorbed.flatMap(({ draft }) => {
      const fees = feeOnlyDraft(draft, manualFeeNote(draft.note));
      return fees ? [fees] : [];
    }),
  };
}
