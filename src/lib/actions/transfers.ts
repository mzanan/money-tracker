"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { kindOfSource } from "@/lib/constants/sources";
import { relativeUsdDiff, toUsdPair } from "@/lib/currency";
import { getTransferSources } from "@/lib/data/sources";
import { getUser } from "@/lib/session";
import { buildTransactionRow, EXTERNAL_ID_PREFIX } from "@/lib/transactions";
import type { FxRates } from "@/types/db";

import {
  buildCurrencyContext,
  withRatesErrorHandling,
  type ActionResult,
} from "./transactions";

const TRANSFER_AMOUNT_TOLERANCE = 0.05;

function transferAmountsMatch(
  a: { amount: number; currency: string },
  b: { amount: number; currency: string },
  rates: FxRates | null,
): boolean {
  const usd = toUsdPair(a, b, rates);
  if (!usd) return false;
  const diff = relativeUsdDiff(usd.usdA, usd.usdB);
  return diff !== null && diff <= TRANSFER_AMOUNT_TOLERANCE;
}

export async function getTransferAccountOptions(
  excludeSource: string,
): Promise<ActionResult<{ sources: string[] }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const sources = await getTransferSources(user.id, excludeSource);
  return { ok: true, data: { sources } };
}

export async function markAsTransfer(
  txId: string,
  mirrorSource: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const tx = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.user_id, user.id)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!tx) return { ok: false, error: "Transaction not found" };
  if (tx.transfer_group) {
    return { ok: false, error: "Already marked as a transfer" };
  }
  if (mirrorSource === tx.source) {
    return { ok: false, error: "Pick a different account" };
  }
  if (kindOfSource(mirrorSource) === "api") {
    return { ok: false, error: "Can't mirror into a synced account" };
  }

  const ctxResult = await withRatesErrorHandling(() =>
    buildCurrencyContext(user.id),
  );
  if (!ctxResult.ok) return ctxResult;
  const ctx = ctxResult.data;
  if (!ctx) return { ok: false, error: "Settings not found" };

  const mirror = buildTransactionRow(
    {
      userId: user.id,
      kind: tx.kind === "expense" ? "income" : "expense",
      amount: tx.amount_original,
      currency: tx.currency_original,
      occurredOn: tx.occurred_on,
      note: tx.note,
      source: mirrorSource,
      externalId: `${EXTERNAL_ID_PREFIX.transfer}${tx.id}`,
    },
    ctx,
  );
  if (!mirror) {
    return { ok: false, error: `No rate for ${tx.currency_original}` };
  }

  try {
    await db.transaction(async (dbTx) => {
      await dbTx
        .insert(transactions)
        .values({ ...mirror, transfer_group: tx.id })
        .onConflictDoNothing({
          target: [
            transactions.user_id,
            transactions.source,
            transactions.external_id,
          ],
        });
      await dbTx
        .update(transactions)
        .set({ transfer_group: tx.id })
        .where(
          and(eq(transactions.id, tx.id), eq(transactions.user_id, user.id)),
        );
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

export async function markPairAsTransfer(
  txId1: string,
  txId2: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (txId1 === txId2) {
    return { ok: false, error: "Pick two different transactions" };
  }

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, user.id),
        inArray(transactions.id, [txId1, txId2]),
      ),
    );
  if (rows.length !== 2) return { ok: false, error: "Transaction not found" };
  if (rows.some((r) => r.transfer_group)) {
    return { ok: false, error: "Already marked as a transfer" };
  }

  const [txA, txB] = rows;
  if (txA.source === txB.source) {
    return { ok: false, error: "Pick transactions from two different accounts" };
  }
  if (txA.kind === txB.kind) {
    return { ok: false, error: "Pick one income and one expense" };
  }

  let rates: FxRates | null = null;
  if (txA.currency_original !== txB.currency_original) {
    const ctxResult = await withRatesErrorHandling(() =>
      buildCurrencyContext(user.id),
    );
    if (!ctxResult.ok) return ctxResult;
    if (!ctxResult.data) return { ok: false, error: "Settings not found" };
    rates = ctxResult.data.rates;
  }

  if (
    !transferAmountsMatch(
      { amount: txA.amount_original, currency: txA.currency_original },
      { amount: txB.amount_original, currency: txB.currency_original },
      rates,
    )
  ) {
    return { ok: false, error: "Amounts don't match closely enough for a transfer" };
  }

  try {
    await db
      .update(transactions)
      .set({ transfer_group: txId1 })
      .where(
        and(
          eq(transactions.user_id, user.id),
          inArray(transactions.id, [txId1, txId2]),
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

export async function unmarkTransfer(txId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const tx = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.user_id, user.id)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!tx?.transfer_group) return { ok: false, error: "Not a transfer" };

  const linked = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, user.id),
        eq(transactions.transfer_group, tx.transfer_group),
      ),
    );

  try {
    await db.transaction(async (dbTx) => {
      for (const row of linked) {
        if (row.external_id?.startsWith(EXTERNAL_ID_PREFIX.transfer)) {
          await dbTx
            .delete(transactions)
            .where(
              and(
                eq(transactions.id, row.id),
                eq(transactions.user_id, user.id),
              ),
            );
        } else {
          await dbTx
            .update(transactions)
            .set({ transfer_group: null })
            .where(
              and(
                eq(transactions.id, row.id),
                eq(transactions.user_id, user.id),
              ),
            );
        }
      }
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}
