"use server";

import { and, eq, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { actionErrorMessage } from "@/lib/actionError";
import { MANUAL_SOURCE } from "@/lib/constants/sources";
import { db } from "@/lib/db";
import { csv_import_locks } from "@/lib/db/schema";
import {
  csvDraft,
  postableCsvDrafts,
  uniqueCsvDrafts,
  type CsvDraft,
} from "@/lib/csv/ledgerDraft";
import { getLastEntryDate, staleCsvTransactionIds } from "@/lib/data/sources";
import {
  deleteLedgerTransactions,
  existingExternalIds,
  getScaleOf,
  postLedgerTransactions,
} from "@/lib/data/ledgerWrites";
import { isSyncable } from "@/lib/integrations";
import { getUser } from "@/lib/session";

import type { ActionResult } from "./transactions";

export interface CsvRow {
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string;
  occurredAt?: string;
  description: string | null;
  externalId?: string | null;
  feeAmount?: number;
}

export interface CsvImportInput {
  source: string;
  rows: CsvRow[];
  replace?: boolean;
}

const REPLACE_LOCK_STALE_MS = 10 * 60 * 1000;
const BATCH_SIZE = 500;

// Single atomic UPSERT: acquires a free lock, or steals one only if it's
// stale, in one statement. Avoids a separate SELECT+DELETE+INSERT reclaim,
// which is not atomic and lets two callers both believe they hold the lock.
// Returns the lock's created_at as an ownership token for releaseReplaceLock.
async function acquireReplaceLock(
  userId: string,
  source: string,
): Promise<string | null> {
  const staleBefore = new Date(
    Date.now() - REPLACE_LOCK_STALE_MS,
  ).toISOString();
  const acquired = await db
    .insert(csv_import_locks)
    .values({ user_id: userId, source })
    .onConflictDoUpdate({
      target: [csv_import_locks.user_id, csv_import_locks.source],
      set: { created_at: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` },
      setWhere: lt(csv_import_locks.created_at, staleBefore),
    })
    .returning({ created_at: csv_import_locks.created_at });
  return acquired[0]?.created_at ?? null;
}

async function releaseReplaceLock(
  userId: string,
  source: string,
  token: string,
): Promise<void> {
  await db
    .delete(csv_import_locks)
    .where(
      and(
        eq(csv_import_locks.user_id, userId),
        eq(csv_import_locks.source, source),
        eq(csv_import_locks.created_at, token),
      ),
    );
}

export async function getLastImportDate(
  source: string,
): Promise<ActionResult<{ date: string | null }>> {
  const normalized = source.trim().toLowerCase();
  if (!normalized) return { ok: true, data: { date: null } };

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  return {
    ok: true,
    data: { date: await getLastEntryDate(user.id, normalized) },
  };
}

export async function importCsvRows(
  input: CsvImportInput,
): Promise<
  ActionResult<{ imported: number; skipped: number; errors: number }>
> {
  const source = input.source.trim().toLowerCase();
  if (!source) {
    return { ok: false, error: "Account name is required" };
  }
  if (source === MANUAL_SOURCE) {
    return { ok: false, error: "Account name 'manual' is reserved" };
  }
  if (isSyncable(source)) {
    return {
      ok: false,
      error: `Account name '${source}' is reserved for an API integration`,
    };
  }
  if (input.rows.length === 0) {
    return { ok: false, error: "No rows to import" };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const scaleOf = await getScaleOf();
  let errors = 0;
  const drafts: CsvDraft[] = [];
  for (const row of input.rows) {
    const built = csvDraft(row, source, scaleOf);
    if (built) drafts.push(built);
    else errors += 1;
  }

  if (input.replace && drafts.length === 0) {
    return {
      ok: false,
      error: `All ${errors} rows failed validation. Nothing was imported, existing data was left untouched.`,
    };
  }

  let lockToken: string | null = null;
  if (input.replace) {
    try {
      lockToken = await acquireReplaceLock(user.id, source);
    } catch (error) {
      return {
        ok: false,
        error: `Could not start replace import: ${actionErrorMessage(
          error,
          "unknown error",
        )}`,
      };
    }
    if (!lockToken) {
      return {
        ok: false,
        error: `A replace import for '${source}' is already in progress. Wait for it to finish and try again.`,
      };
    }
  }

  let imported = 0;
  try {
    const unique = uniqueCsvDrafts(drafts);
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      try {
        imported += await db.transaction(async (dbTx) => {
          const taken = await existingExternalIds(
            user.id,
            source,
            batch.flatMap(({ externalIds }) => externalIds),
            dbTx,
          );
          await postLedgerTransactions(
            user.id,
            batch.flatMap((item) =>
              postableCsvDrafts(item, taken).map((draft) => ({ draft })),
            ),
            dbTx,
          );
          return batch.filter(({ externalIds }) => !taken.has(externalIds[0]))
            .length;
        });
      } catch (error) {
        return {
          ok: false,
          error: `Batch starting at row ${i + 1} failed: ${actionErrorMessage(
            error,
            "unknown error",
          )} (${imported} rows already imported, existing data untouched)`,
        };
      }
    }

    if (input.replace) {
      try {
        const keep = new Set(drafts.flatMap(({ externalIds }) => externalIds));
        await db.transaction(async (dbTx) => {
          const staleIds = await staleCsvTransactionIds(
            user.id,
            source,
            keep,
            dbTx,
          );
          await deleteLedgerTransactions(user.id, staleIds, dbTx);
        });
      } catch (error) {
        return {
          ok: false,
          error: `Import succeeded (${imported} rows) but removing old rows failed, nothing was removed: ${actionErrorMessage(
            error,
            "unknown error",
          )}. Re-run replace to finish cleanup.`,
        };
      }
    }
  } finally {
    if (input.replace && lockToken) {
      await releaseReplaceLock(user.id, source, lockToken);
    }
  }

  const skipped = drafts.length - imported;
  revalidatePath("/", "layout");

  return { ok: true, data: { imported, skipped, errors } };
}
