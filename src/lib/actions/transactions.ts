"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { transactions, user_settings } from "@/lib/db/schema";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/lib/schemas/transaction";
import { getUser } from "@/lib/session";
import { applyAutoCategories } from "@/lib/categorization";
import { buildTransactionRow } from "@/lib/transactions";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

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

  const row = buildTransactionRow(
    {
      userId: user.id,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      occurredOn: parsed.data.occurredOn,
      category: parsed.data.category,
      note: parsed.data.note,
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
    if (!row.category) {
      await applyAutoCategories(user.id).catch(() => {});
    }
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

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await db
      .update(transactions)
      .set({
        kind: parsed.data.kind,
        amount_original: parsed.data.amount,
        currency_original: parsed.data.currency,
        category: parsed.data.category?.trim() || null,
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

export async function updateTransactionCategory(
  id: string,
  category: string | null,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const trimmed = category?.trim() ?? "";
  if (trimmed.length > 40) {
    return { ok: false, error: "Category must be 40 characters or fewer" };
  }

  try {
    await db
      .update(transactions)
      .set({ category: trimmed || null })
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

export async function updateTransactionComment(
  id: string,
  comment: string | null,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const trimmed = comment?.trim() ?? "";
  if (trimmed.length > 280) {
    return { ok: false, error: "Note must be 280 characters or fewer" };
  }

  try {
    await db
      .update(transactions)
      .set({ comment: trimmed || null })
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

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

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
