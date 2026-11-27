import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { chunk } from "@/lib/arrays";
import {
  SHEET_REQUEST_ROWS,
  type SheetRowStatus,
} from "@/lib/constants/sheetImport";
import { db } from "@/lib/db";
import {
  sheet_import_layouts,
  sheet_import_rows,
  sheet_imports,
} from "@/lib/db/schema";
import {
  deleteLedgerTransactions,
  transactionIdsForExternalIds,
} from "@/lib/data/ledgerWrites";
import { ConventionsSchema, type Conventions } from "@/lib/sheetImport/layout";
import { layoutHash } from "@/lib/sheetImport/layoutHash";
import type { SheetRowLog } from "@/lib/sheetImport/log";
import { RECIPE_VERSION } from "@/lib/sheetImport/recipe";

const RECENT_IMPORTS = 5;

export interface SheetImportSummary {
  id: string;
  source: string;
  fileName: string;
  importedCount: number;
  skippedCount: number;
  notReadCount: number;
  createdAt: string;
}

export async function getSavedLayouts(
  userId: string,
  signatures: string[],
): Promise<Map<string, { conventions: Conventions; lastSource: string }>> {
  const byHash = new Map(signatures.map((s) => [layoutHash(s), s]));
  const out = new Map<
    string,
    { conventions: Conventions; lastSource: string }
  >();
  if (!byHash.size) return out;
  const rows = await db
    .select()
    .from(sheet_import_layouts)
    .where(
      and(
        eq(sheet_import_layouts.user_id, userId),
        eq(sheet_import_layouts.recipe_version, RECIPE_VERSION),
        inArray(sheet_import_layouts.signature, [...byHash.keys()]),
      ),
    );
  for (const row of rows) {
    const parsed = ConventionsSchema.safeParse(row.conventions);
    const signature = byHash.get(row.signature);
    if (parsed.success && signature) {
      out.set(signature, {
        conventions: parsed.data,
        lastSource: row.last_source,
      });
    }
  }
  return out;
}

export async function saveLayouts(
  userId: string,
  source: string,
  layouts: ReadonlyArray<{ signature: string; conventions: Conventions }>,
): Promise<void> {
  if (!layouts.length) return;
  await db
    .insert(sheet_import_layouts)
    .values(
      layouts.map((layout) => ({
        user_id: userId,
        signature: layoutHash(layout.signature),
        recipe_version: RECIPE_VERSION,
        conventions: layout.conventions,
        last_source: source,
      })),
    )
    .onConflictDoUpdate({
      target: [sheet_import_layouts.user_id, sheet_import_layouts.signature],
      set: {
        recipe_version: sql`excluded.recipe_version`,
        conventions: sql`excluded.conventions`,
        last_source: sql`excluded.last_source`,
        updated_at: new Date().toISOString(),
      },
    });
}

export async function createSheetImport(
  userId: string,
  source: string,
  fileName: string,
): Promise<string> {
  const [row] = await db
    .insert(sheet_imports)
    .values({ user_id: userId, source, file_name: fileName })
    .returning({ id: sheet_imports.id });
  return row.id;
}

export async function getOpenSheetImport(
  userId: string,
  importId: string,
): Promise<{ id: string; source: string } | null> {
  const [row] = await db
    .select({ id: sheet_imports.id, source: sheet_imports.source })
    .from(sheet_imports)
    .where(
      and(
        eq(sheet_imports.id, importId),
        eq(sheet_imports.user_id, userId),
        isNull(sheet_imports.undone_at),
      ),
    );
  return row ?? null;
}

export async function recordSheetRows(
  userId: string,
  importId: string,
  rows: ReadonlyArray<SheetRowLog>,
): Promise<void> {
  for (const batch of chunk(rows, SHEET_REQUEST_ROWS)) {
    await db.insert(sheet_import_rows).values(
      batch.map((row) => ({
        import_id: importId,
        user_id: userId,
        sheet: row.sheet,
        row: row.row,
        status: row.status,
        step: row.step,
        reason: row.reason,
        external_id: row.externalId,
        matched_transaction_id: row.matchedTransactionId,
      })),
    );
  }
}

export async function refreshSheetImportCounts(
  userId: string,
  importId: string,
): Promise<void> {
  const counts = await db
    .select({ status: sheet_import_rows.status, total: count() })
    .from(sheet_import_rows)
    .where(
      and(
        eq(sheet_import_rows.user_id, userId),
        eq(sheet_import_rows.import_id, importId),
      ),
    )
    .groupBy(sheet_import_rows.status);
  const total = (statuses: SheetRowStatus[]) =>
    counts
      .filter((c) => statuses.includes(c.status))
      .reduce((sum, c) => sum + c.total, 0);
  await db
    .update(sheet_imports)
    .set({
      imported_count: total(["imported"]),
      skipped_count: total(["already_imported", "duplicate", "excluded"]),
      not_read_count: total(["not_read"]),
    })
    .where(
      and(eq(sheet_imports.id, importId), eq(sheet_imports.user_id, userId)),
    );
}

export async function getRecentSheetImports(
  userId: string,
): Promise<SheetImportSummary[]> {
  const rows = await db
    .select()
    .from(sheet_imports)
    .where(
      and(eq(sheet_imports.user_id, userId), isNull(sheet_imports.undone_at)),
    )
    .orderBy(desc(sheet_imports.created_at))
    .limit(RECENT_IMPORTS);
  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    fileName: row.file_name,
    importedCount: row.imported_count,
    skippedCount: row.skipped_count,
    notReadCount: row.not_read_count,
    createdAt: row.created_at,
  }));
}

export async function undoSheetImport(
  userId: string,
  importId: string,
): Promise<number> {
  const open = await getOpenSheetImport(userId, importId);
  if (!open) return 0;
  const logged = await db
    .select({ externalId: sheet_import_rows.external_id })
    .from(sheet_import_rows)
    .where(
      and(
        eq(sheet_import_rows.user_id, userId),
        eq(sheet_import_rows.import_id, importId),
        eq(sheet_import_rows.status, "imported"),
      ),
    );
  const externalIds = logged.flatMap((r) =>
    r.externalId ? [r.externalId] : [],
  );
  const transactionIds = await transactionIdsForExternalIds(
    userId,
    open.source,
    externalIds,
  );
  const deleted = await db.transaction(async (tx) => {
    const removed = await deleteLedgerTransactions(
      userId,
      [...transactionIds],
      tx,
    );
    await tx
      .update(sheet_imports)
      .set({ undone_at: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` })
      .where(
        and(eq(sheet_imports.id, importId), eq(sheet_imports.user_id, userId)),
      );
    return removed;
  });
  return deleted;
}
