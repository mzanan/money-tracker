"use server";

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { isSupportedCurrency } from "@/lib/constants/currencies";
import { isValidAmountForCurrency, roundForCurrency } from "@/lib/currency";
import { isValidCalendarDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { csv_import_locks, transactions, user_settings } from "@/lib/db/schema";
import { isSyncable } from "@/lib/integrations";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";
import {
  buildTransactionRow,
  csvExternalIdCondition,
  EXTERNAL_ID_PREFIX,
  transactionContentHash,
} from "@/lib/transactions";
import type { TransactionInsert } from "@/types/db";

import type { ActionResult } from "./transactions";

export interface CsvRow {
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string;
  occurredAt?: string;
  description: string | null;
  externalId?: string | null;
}

export interface CsvImportInput {
  source: string;
  rows: CsvRow[];
  replace?: boolean;
}

const REPLACE_LOCK_STALE_MS = 10 * 60 * 1000;

// Single atomic UPSERT: acquires a free lock, or steals one only if it's
// stale, in one statement. Avoids a separate SELECT+DELETE+INSERT reclaim,
// which is not atomic and lets two callers both believe they hold the lock.
// Returns the lock's created_at as an ownership token for releaseReplaceLock.
async function acquireReplaceLock(
  userId: string,
  source: string,
): Promise<string | null> {
  const staleBefore = new Date(Date.now() - REPLACE_LOCK_STALE_MS).toISOString();
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

  const row = await db
    .select({ occurred_on: transactions.occurred_on })
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, user.id),
        eq(transactions.source, normalized),
      ),
    )
    .orderBy(desc(transactions.occurred_on))
    .limit(1)
    .then((rows) => rows[0]);

  return { ok: true, data: { date: row?.occurred_on ?? null } };
}

export async function importCsvRows(
  input: CsvImportInput,
): Promise<ActionResult<{ imported: number; skipped: number; errors: number }>> {
  const source = input.source.trim().toLowerCase();
  if (!source) {
    return { ok: false, error: "Account name is required" };
  }
  if (source === "manual") {
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

  const settings = await db
    .select({ currencies: user_settings.currencies })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);
  if (!settings) return { ok: false, error: "Settings not found" };

  let rates;
  try {
    rates = (await getRates()).rates;
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return {
        ok: false,
        error: "Exchange rates unavailable. Try again in a bit.",
      };
    }
    return { ok: false, error: "Error fetching rates" };
  }

  let errors = 0;
  const insertRows: TransactionInsert[] = [];
  for (const row of input.rows) {
    if (!isSupportedCurrency(row.currency) && !rates[row.currency]) {
      errors += 1;
      continue;
    }
    if (!isValidAmountForCurrency(row.amount, row.currency)) {
      errors += 1;
      continue;
    }
    const amount = roundForCurrency(row.amount, row.currency);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors += 1;
      continue;
    }
    const occurredOn = row.occurredOn.slice(0, 10);
    if (!isValidCalendarDate(occurredOn)) {
      errors += 1;
      continue;
    }

    const providedId = row.externalId?.trim();
    const externalId = providedId
      ? `${EXTERNAL_ID_PREFIX.csv}${providedId.toLowerCase().slice(0, 64)}`
      : transactionContentHash({ ...row, amount }).slice(0, 32);
    const built = buildTransactionRow(
      {
        userId: user.id,
        kind: row.kind,
        amount,
        currency: row.currency,
        occurredOn,
        occurredAt: row.occurredAt,
        note: row.description,
        source,
        externalId,
      },
      { rates, userCurrencies: settings.currencies },
    );
    if (!built) {
      errors += 1;
      continue;
    }
    insertRows.push(built);
  }

  if (input.replace && insertRows.length === 0) {
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
        error: `Could not start replace import: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      };
    }
    if (!lockToken) {
      return {
        ok: false,
        error: `A replace import for '${source}' is already in progress. Wait for it to finish and try again.`,
      };
    }
  }

  const BATCH_SIZE = 500;
  let imported = 0;
  try {
    for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
      const batch = insertRows.slice(i, i + BATCH_SIZE);
      try {
        const inserted = await db
          .insert(transactions)
          .values(batch)
          .onConflictDoNothing({
            target: [
              transactions.user_id,
              transactions.source,
              transactions.external_id,
            ],
          })
          .returning({ id: transactions.id });
        imported += inserted.length;
      } catch (error) {
        return {
          ok: false,
          error: `Batch starting at row ${i + 1} failed: ${
            error instanceof Error ? error.message : "unknown"
          } (${imported} rows already imported, existing data untouched)`,
        };
      }
    }

    if (input.replace) {
      try {
        await db.transaction(async (dbTx) => {
          const staleRows = await dbTx
            .select({
              id: transactions.id,
              external_id: transactions.external_id,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.user_id, user.id),
                eq(transactions.source, source),
                csvExternalIdCondition(),
              ),
            );

          const newExternalIds = new Set(
            insertRows.map((row) => row.external_id),
          );
          const staleIds = staleRows
            .filter((row) => !newExternalIds.has(row.external_id))
            .map((row) => row.id);

          for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
            const chunk = staleIds.slice(i, i + BATCH_SIZE);
            await dbTx
              .delete(transactions)
              .where(
                and(
                  eq(transactions.user_id, user.id),
                  inArray(transactions.id, chunk),
                ),
              );
          }
        });
      } catch (error) {
        return {
          ok: false,
          error: `Import succeeded (${imported} rows) but removing old rows failed, nothing was removed: ${
            error instanceof Error ? error.message : "unknown"
          }. Re-run replace to finish cleanup.`,
        };
      }
    }
  } finally {
    if (input.replace && lockToken) {
      await releaseReplaceLock(user.id, source, lockToken);
    }
  }

  const skipped = insertRows.length - imported;
  revalidatePath("/", "layout");

  return { ok: true, data: { imported, skipped, errors } };
}
