"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
import type { Conventions } from "@/lib/sheetImport/layout";
import {
  ChunkInputSchema,
  FinishImportSchema,
  MAX_SIGNATURES,
  StartImportSchema,
} from "@/lib/sheetImport/importInput";
import { chunkRowLogs, type SheetRowLog } from "@/lib/sheetImport/log";
import { getUser } from "@/lib/session";

import { importCsvRows } from "./csvImport";
import type { ActionResult } from "./transactions";

export async function getSheetLayouts(signatures: string[]): Promise<
  ActionResult<{
    layouts: Array<{
      signature: string;
      conventions: Conventions;
      lastSource: string;
    }>;
  }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = z.array(z.string()).max(MAX_SIGNATURES).safeParse(signatures);
  if (!parsed.success) return { ok: false, error: "Invalid layouts" };
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
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = StartImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid import" };
  const source = parsed.data.source.trim().toLowerCase();
  if (!source) return { ok: false, error: "Account name is required" };
  const importId = await createSheetImport(
    user.id,
    source,
    parsed.data.fileName.slice(0, 200),
  );
  return { ok: true, data: { importId } };
}

export async function importSheetChunk(
  input: z.input<typeof ChunkInputSchema>,
): Promise<
  ActionResult<{ imported: number; skipped: number; errors: number }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = ChunkInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rows" };
  const { importId, rows } = parsed.data;
  const open = await getOpenSheetImport(user.id, importId);
  if (!open) return { ok: false, error: "This import is no longer open" };
  const ids = rows.map((r) => csvExternalId(r.csv.externalId ?? ""));
  const before = await existingExternalIds(user.id, open.source, ids);
  const result = await importCsvRows({
    source: open.source,
    rows: rows.map((r) => r.csv),
  });
  if (!result.ok) return result;
  const after = await existingExternalIds(user.id, open.source, ids);
  await recordSheetRows(
    user.id,
    open.id,
    chunkRowLogs(rows, ids, before, after),
  );
  return result;
}

export async function finishSheetImport(input: {
  importId: string;
  rows: SheetRowLog[];
  layouts: Array<{ signature: string; conventions: Conventions }>;
}): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = FinishImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid import log" };
  const { importId, rows, layouts } = parsed.data;
  const open = await getOpenSheetImport(user.id, importId);
  if (!open) return { ok: false, error: "This import is no longer open" };
  await recordSheetRows(user.id, open.id, rows);
  await refreshSheetImportCounts(user.id, open.id);
  await saveLayouts(user.id, open.source, layouts);
  revalidatePath("/settings");
  return { ok: true };
}

export async function undoSheetImportAction(
  importId: string,
): Promise<ActionResult<{ removed: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = z.string().min(1).safeParse(importId);
  if (!parsed.success) return { ok: false, error: "Invalid import" };
  const removed = await undoSheetImport(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, data: { removed } };
}
