import { z } from "zod";

import {
  DUPLICATE_STEPS,
  SHEET_ROW_STATUSES,
} from "@/lib/constants/sheetImport";
import type { SheetRowCheck } from "@/lib/sheetImport/check";
import type { SheetRowIssue } from "@/lib/sheetImport/apply";

export const RowLogSchema = z.object({
  sheet: z.string(),
  row: z.number().int().nonnegative(),
  status: z.enum(SHEET_ROW_STATUSES),
  step: z.enum(DUPLICATE_STEPS).nullable(),
  reason: z.string().nullable(),
  externalId: z.string().nullable(),
  matchedTransactionId: z.string().nullable(),
});

export type SheetRowLog = z.infer<typeof RowLogSchema>;

export function skippedRowLog(
  row: { sheet: string; row: number },
  check: SheetRowCheck,
): SheetRowLog {
  return {
    sheet: row.sheet,
    row: row.row,
    status: check.state === "new" ? "excluded" : check.state,
    step: check.step,
    reason: null,
    externalId: null,
    matchedTransactionId: check.match?.id ?? null,
  };
}

export function notReadLog(issue: SheetRowIssue): SheetRowLog {
  return {
    sheet: issue.sheet,
    row: issue.row,
    status: "not_read",
    step: null,
    reason: issue.reason,
    externalId: null,
    matchedTransactionId: null,
  };
}

export function chunkRowLogs(
  rows: ReadonlyArray<{ sheet: string; row: number }>,
  ids: ReadonlyArray<string>,
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
): SheetRowLog[] {
  return rows.map((r, i) => {
    const existed = before.has(ids[i]);
    const created = after.has(ids[i]) && !existed;
    const status: SheetRowLog["status"] = created
      ? "imported"
      : existed
        ? "already_imported"
        : "not_read";
    return {
      sheet: r.sheet,
      row: r.row,
      status,
      step: existed ? "external_id" : null,
      reason: created || existed ? null : "rejected when saving",
      externalId: created ? ids[i] : null,
      matchedTransactionId: null,
    };
  });
}
