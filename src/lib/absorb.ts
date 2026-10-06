import { dayWindow } from "@/lib/dates";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { normalizeTags } from "@/lib/transactions";

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
