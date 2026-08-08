"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { isValidAmountForCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { transactions, user_settings } from "@/lib/db/schema";
import { isSyncedExternalId } from "@/lib/externalIds";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/lib/schemas/transaction";
import { getUser } from "@/lib/session";
import { kindOfSource, normalizeSource } from "@/lib/constants/sources";
import { dedupeTags } from "@/lib/tags";
import { buildTransactionRow, normalizeTags } from "@/lib/transactions";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function buildCurrencyContext(userId: string) {
  const settings = await db
    .select({ currencies: user_settings.currencies })
    .from(user_settings)
    .where(eq(user_settings.user_id, userId))
    .limit(1)
    .then((rows) => rows[0]);
  if (!settings) return null;
  const rates = (await getRates()).rates;
  return { rates, userCurrencies: settings.currencies };
}

export async function withRatesErrorHandling<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return { ok: false, error: "Exchange rates unavailable. Try again." };
    }
    return { ok: false, error: "Error fetching rates" };
  }
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  if (!isValidAmountForCurrency(parsed.data.amount, parsed.data.currency)) {
    return {
      ok: false,
      error: `${parsed.data.currency} has no decimals. Enter a whole number.`,
    };
  }

  let source: string | undefined;
  if (parsed.data.source) {
    source = normalizeSource(parsed.data.source) ?? undefined;
    if (!source || kindOfSource(source) === "api") {
      return { ok: false, error: "Invalid source" };
    }
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

  const ratesResult = await withRatesErrorHandling(() => getRates());
  if (!ratesResult.ok) return ratesResult;
  const rates = ratesResult.data.rates;

  const row = buildTransactionRow(
    {
      userId: user.id,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      occurredOn: parsed.data.occurredOn,
      tags: parsed.data.tags,
      note: parsed.data.note,
      source,
    },
    { rates, userCurrencies: settings.currencies },
  );

  if (!row) {
    return {
      ok: false,
      error: `No rate available for ${parsed.data.currency}`,
    };
  }

  try {
    const [inserted] = await db
      .insert(transactions)
      .values(row)
      .returning({ id: transactions.id });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: inserted.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Insert failed",
    };
  }
}

/**
 * Updates an existing transaction. Does NOT re-snapshot rates: edits are for
 * fixes (amount/category/note/date), not for "update to today's rate". For that,
 * delete and re-create.
 */
export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<ActionResult> {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  if (!isValidAmountForCurrency(parsed.data.amount, parsed.data.currency)) {
    return {
      ok: false,
      error: `${parsed.data.currency} has no decimals. Enter a whole number.`,
    };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const tx = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, parsed.data.id),
        eq(transactions.user_id, user.id),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!tx) return { ok: false, error: "Transaction not found" };
  if (
    tx.transfer_group &&
    (tx.kind !== parsed.data.kind ||
      tx.amount_original !== parsed.data.amount ||
      tx.currency_original !== parsed.data.currency)
  ) {
    return {
      ok: false,
      error: "Undo the transfer before editing amount, currency, or kind",
    };
  }

  try {
    await db
      .update(transactions)
      .set({
        kind: parsed.data.kind,
        amount_original: parsed.data.amount,
        currency_original: parsed.data.currency,
        tags: normalizeTags(parsed.data.tags),
        note: parsed.data.note?.trim() || null,
        occurred_on: parsed.data.occurredOn,
      })
      .where(
        and(
          eq(transactions.id, parsed.data.id),
          eq(transactions.user_id, user.id),
        ),
      );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

export async function updateTransactionSource(
  id: string,
  source: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const normalized = normalizeSource(source);
  if (!normalized) return { ok: false, error: "Invalid account name" };
  if (kindOfSource(normalized) === "api") {
    return { ok: false, error: "Can't move into a synced account" };
  }

  const tx = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.user_id, user.id)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!tx) return { ok: false, error: "Transaction not found" };
  if (kindOfSource(tx.source) === "api" && isSyncedExternalId(tx.external_id)) {
    return { ok: false, error: "Synced transactions can't change account" };
  }
  if (tx.transfer_group) {
    return { ok: false, error: "Undo the transfer before changing account" };
  }
  if (normalized === tx.source) {
    return { ok: false, error: "Pick a different account" };
  }

  try {
    await db
      .update(transactions)
      .set({ source: normalized })
      .where(and(eq(transactions.id, id), eq(transactions.user_id, user.id)));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

export async function mergeTransactions(
  keepId: string,
  removeId: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (keepId === removeId) {
    return { ok: false, error: "Pick two different transactions" };
  }

  try {
    const rows = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, user.id),
          inArray(transactions.id, [keepId, removeId]),
        ),
      );
    const keep = rows.find((row) => row.id === keepId);
    const removed = rows.find((row) => row.id === removeId);
    if (!keep || !removed) return { ok: false, error: "Transaction not found" };
    if (keep.transfer_group || removed.transfer_group) {
      return {
        ok: false,
        error: "Undo the transfer before merging this transaction",
      };
    }

    const preferRemovedDetails =
      kindOfSource(keep.source) === "api" &&
      kindOfSource(removed.source) !== "api";
    const patch: Partial<typeof keep> = {};
    if (removed.note && (preferRemovedDetails || !keep.note)) {
      patch.note = removed.note;
    }
    const mergedTags = normalizeTags(
      preferRemovedDetails
        ? [...removed.tags, ...keep.tags]
        : [...keep.tags, ...removed.tags],
    );
    if (mergedTags.length !== keep.tags.length) {
      patch.tags = mergedTags;
    }
    if (!keep.comment && removed.comment) patch.comment = removed.comment;

    await db.transaction(async (dbTx) => {
      if (Object.keys(patch).length > 0) {
        await dbTx
          .update(transactions)
          .set(patch)
          .where(
            and(eq(transactions.id, keepId), eq(transactions.user_id, user.id)),
          );
      }
      await dbTx
        .delete(transactions)
        .where(
          and(eq(transactions.user_id, user.id), eq(transactions.id, removeId)),
        );
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Merge failed",
    };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const tx = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.user_id, user.id)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!tx) return { ok: false, error: "Transaction not found" };
  if (tx.transfer_group) {
    return {
      ok: false,
      error: "Undo the transfer before deleting this transaction",
    };
  }

  try {
    await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.user_id, user.id)));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

export async function getUsedTags(): Promise<ActionResult<string[]>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const rows = await db
    .select({ tags: transactions.tags })
    .from(transactions)
    .where(eq(transactions.user_id, user.id))
    .orderBy(desc(transactions.occurred_on));

  return { ok: true, data: dedupeTags(rows.flatMap((row) => row.tags)) };
}
