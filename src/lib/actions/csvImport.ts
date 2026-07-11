"use server";

import { and, desc, eq, isNotNull, like, notLike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { isSupportedCurrency } from "@/config/currencies";
import { isValidAmountForCurrency, roundForCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { transactions, user_settings } from "@/lib/db/schema";
import { isSyncable } from "@/lib/integrations";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";
import {
  buildTransactionRow,
  transactionContentHash,
} from "@/lib/transactions";

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
  const insertRows = [];
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      errors += 1;
      continue;
    }

    const providedId = row.externalId?.trim();
    const externalId = providedId
      ? `csv:${providedId.toLowerCase().slice(0, 64)}`
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

  if (input.replace) {
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.user_id, user.id),
          eq(transactions.source, source),
          isNotNull(transactions.external_id),
          or(
            like(transactions.external_id, "csv:%"),
            notLike(transactions.external_id, "%:%"),
          ),
        ),
      );
  }

  const BATCH_SIZE = 500;
  let imported = 0;
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
        } (${imported} rows already imported)`,
      };
    }
  }

  const skipped = insertRows.length - imported;
  revalidatePath("/", "layout");

  return { ok: true, data: { imported, skipped, errors } };
}
