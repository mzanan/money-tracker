"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DUPLICATE_STEPS,
  SHEET_ROW_STATUSES,
} from "@/lib/constants/sheetImport";
import { csvExternalId } from "@/lib/csv/ledgerDraft";
import { existingExternalIds } from "@/lib/data/ledgerWrites";
import {
  createSheetImport,
  getOpenSheetImport,
  getSavedLayouts,
  recordSheetRows,
  refreshSheetImportCounts,
  saveLayouts,
  undoSheetImport,
} from "@/lib/data/sheetImports";
import { ConventionsSchema, type Conventions } from "@/lib/sheetImport/layout";
import { getUser } from "@/lib/session";

import { importCsvRows, type CsvRow } from "./csvImport";
import type { ActionResult } from "./transactions";

const MAX_SIGNATURES = 500;

const RowLogSchema = z.object({
  sheet: z.string(),
  row: z.number().int().nonnegative(),
  status: z.enum(SHEET_ROW_STATUSES),
  step: z.enum(DUPLICATE_STEPS).nullable(),
  reason: z.string().nullable(),
  externalId: z.string().nullable(),
  matchedTransactionId: z.string().nullable(),
});

export async function getSheetLayouts(
  signatures: string[],
): Promise<
  ActionResult<{
    layouts: Array<{
      signature: string;
      conventions: Conventions;
      lastSource: string;
    }>;
  }>
> {
  const parsed = z.array(z.string()).max(MAX_SIGNATURES).safeParse(signatures);
  if (!parsed.success) return { ok: false, error: "Invalid layouts" };
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const saved = await getSavedLayouts(user.id, parsed.data);
  return {
    ok: true,
    data: {
      layouts: [...saved].map(([signature, layout]) => ({
        signature,
        ...layout,
      })),
    },
  };
}

export async function startSheetImport(input: {
  source: string;
  fileName: string;
}): Promise<ActionResult<{ importId: string }>> {
  const source = input.source.trim().toLowerCase();
  if (!source) return { ok: false, error: "Account name is required" };
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const importId = await createSheetImport(
    user.id,
    source,
    input.fileName.slice(0, 200),
  );
  return { ok: true, data: { importId } };
}

export async function importSheetChunk(input: {
  importId: string;
  rows: Array<{ sheet: string; row: number; csv: CsvRow }>;
}): Promise<ActionResult<{ imported: number; skipped: number; errors: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const open = await getOpenSheetImport(user.id, input.importId);
  if (!open) return { ok: false, error: "This import is no longer open" };
  const ids = input.rows.map((r) => csvExternalId(r.csv.externalId ?? ""));
  const before = await existingExternalIds(user.id, open.source, ids);
  const result = await importCsvRows({
    source: open.source,
    rows: input.rows.map((r) => r.csv),
  });
  if (!result.ok) return result;
  const after = await existingExternalIds(user.id, open.source, ids);
  await recordSheetRows(
    user.id,
    open.id,
    input.rows.map((r, i) => {
      const created = after.has(ids[i]) && !before.has(ids[i]);
      return {
        sheet: r.sheet,
        row: r.row,
        status: created
          ? "imported"
          : before.has(ids[i])
            ? "already_imported"
            : "not_read",
        step: before.has(ids[i]) ? "external_id" : null,
        reason: created || before.has(ids[i]) ? null : "rejected when saving",
        externalId: created ? ids[i] : null,
        matchedTransactionId: null,
      };
    }),
  );
  return result;
}

export async function finishSheetImport(input: {
  importId: string;
  rows: z.infer<typeof RowLogSchema>[];
  layouts: Array<{ signature: string; conventions: Conventions }>;
}): Promise<ActionResult> {
  const rows = z.array(RowLogSchema).safeParse(input.rows);
  const layouts = z
    .array(z.object({ signature: z.string(), conventions: ConventionsSchema }))
    .max(MAX_SIGNATURES)
    .safeParse(input.layouts);
  if (!rows.success || !layouts.success) {
    return { ok: false, error: "Invalid import log" };
  }
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const open = await getOpenSheetImport(user.id, input.importId);
  if (!open) return { ok: false, error: "This import is no longer open" };
  await recordSheetRows(user.id, open.id, rows.data);
  await refreshSheetImportCounts(user.id, open.id);
  await saveLayouts(user.id, open.source, layouts.data);
  revalidatePath("/settings");
  return { ok: true };
}

export async function undoSheetImportAction(
  importId: string,
): Promise<ActionResult<{ removed: number }>> {
  if (typeof importId !== "string") return { ok: false, error: "Invalid import" };
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const removed = await undoSheetImport(user.id, importId);
  revalidatePath("/", "layout");
  return { ok: true, data: { removed } };
}
