"use server";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupportedCurrency } from "@/lib/constants/currencies";

import {
  BUDGET_MONTH_LOCK_ERROR,
  budgetMonthGroupOf,
  linkedExternalIds,
} from "@/lib/budgetMonth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getAccountCurrencies } from "@/lib/data/accounts";
import {
  kindOfSource,
  labelForSource,
  normalizeSource,
} from "@/lib/constants/sources";
import {
  amountValidationError,
  relativeUsdDiff,
  roundForCurrency,
  toUsdPair,
} from "@/lib/currency";
import { getTransferSources } from "@/lib/data/sources";
import { shiftYearMonth } from "@/lib/dates";
import {
  aggregateFeesBySide,
  inTransitAmount,
  transferCurrencyError,
  transferFeeAmountsError,
  transferFeeSpecs,
  transferLegsAreNet,
  type ReceivedAmount,
  type TransferFeeEntry,
} from "@/lib/transfer";
import { isWithdrawalExternalId } from "@/lib/externalIds";
import { getUser } from "@/lib/session";
import {
  buildTransactionRow,
  buildTransferFeeRows,
  EXTERNAL_ID_PREFIX,
  TRANSFER_FEE_DEST_SUFFIX,
} from "@/lib/transactions";
import type { FxRates, TransactionInsert } from "@/types/db";

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

export interface TransferFeeInput {
  origin?: number;
  destination?: number;
}

export interface MarkTransferOptions {
  fees?: TransferFeeInput;
  received?: ReceivedAmount;
}

const transferFeeSchema = z.object({
  amount: z.number().finite().nonnegative(),
  payer: z.enum(["origin", "destination"]),
});

const recordTransferSchema = z.object({
  amount: z.number().finite().positive(),
  currency: z.string().refine(isSupportedCurrency),
  source: z.string().trim().min(1).max(32),
  destinationSource: z.string().trim().min(1).max(32),
  occurredOn: z.iso.date("Invalid date (yyyy-MM-dd)"),
  note: z.string().trim().max(280).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  fees: z.array(transferFeeSchema).max(2).optional(),
  received: z
    .object({
      amount: z.number().finite().positive(),
      currency: z.string().refine(isSupportedCurrency),
    })
    .optional(),
});

export type RecordTransferInput = z.infer<typeof recordTransferSchema>;

export async function recordTransfer(
  input: RecordTransferInput,
): Promise<ActionResult> {
  const parsed = recordTransferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { amount, currency, occurredOn, tags, received } = parsed.data;

  const source = normalizeSource(parsed.data.source);
  const destinationSource = normalizeSource(parsed.data.destinationSource);
  if (!source || !destinationSource) {
    return { ok: false, error: "Invalid account name" };
  }
  if (source === destinationSource) {
    return { ok: false, error: "Pick a different account" };
  }
  if (kindOfSource(source) === "api") {
    return { ok: false, error: "Can't transfer from a synced account" };
  }
  if (kindOfSource(destinationSource) === "api") {
    return { ok: false, error: "Can't mirror into a synced account" };
  }
  if (received && received.currency === currency) {
    return {
      ok: false,
      error: "The received amount must be in a different currency",
    };
  }

  const amountError = amountValidationError(amount, currency);
  if (amountError) return { ok: false, error: amountError };

  const destinationCurrency = received?.currency ?? currency;
  const fees = aggregateFeesBySide(
    (parsed.data.fees ?? []) as TransferFeeEntry[],
    currency,
    destinationCurrency,
  );
  const inTransit = inTransitAmount(amount, fees.origin, currency);
  if (!(inTransit > 0)) {
    return { ok: false, error: "Fees leave nothing to transfer" };
  }
  const mirrorAmount = received
    ? roundForCurrency(received.amount + fees.destination, destinationCurrency)
    : inTransit;
  const credited = roundForCurrency(
    mirrorAmount - fees.destination,
    destinationCurrency,
  );
  if (!(credited > 0)) {
    return { ok: false, error: "Fees leave nothing to transfer" };
  }

  const feeError = transferFeeAmountsError({
    originFee: fees.origin,
    originCurrency: currency,
    originLegAmount: amount,
    destinationFee: fees.destination,
    destinationCurrency,
    destinationLegAmount: credited,
  });
  if (feeError) return { ok: false, error: feeError };

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const accountCurrencies = await getAccountCurrencies(user.id, [
    source,
    destinationSource,
  ]);
  const originError = transferCurrencyError({
    legCurrency: currency,
    accountCurrency: accountCurrencies.get(source),
    accountLabel: labelForSource(source),
    side: "sent",
  });
  if (originError) return { ok: false, error: originError };
  const destinationError = transferCurrencyError({
    legCurrency: destinationCurrency,
    accountCurrency: accountCurrencies.get(destinationSource),
    accountLabel: labelForSource(destinationSource),
    side: "received",
  });
  if (destinationError) return { ok: false, error: destinationError };

  const ctxResult = await withRatesErrorHandling(() =>
    buildCurrencyContext(user.id),
  );
  if (!ctxResult.ok) return ctxResult;
  const ctx = ctxResult.data;
  if (!ctx) return { ok: false, error: "Settings not found" };

  const group = crypto.randomUUID();
  const expense = buildTransactionRow(
    {
      userId: user.id,
      kind: "expense",
      amount: inTransit,
      currency,
      occurredOn,
      tags,
      note: parsed.data.note,
      source,
    },
    ctx,
  );
  if (!expense) return { ok: false, error: `No rate for ${currency}` };

  const mirror = buildTransactionRow(
    {
      userId: user.id,
      kind: "income",
      amount: mirrorAmount,
      currency: destinationCurrency,
      occurredOn,
      note: parsed.data.note,
      source: destinationSource,
      externalId: `${EXTERNAL_ID_PREFIX.transfer}${group}`,
    },
    ctx,
  );
  if (!mirror) {
    return { ok: false, error: `No rate for ${destinationCurrency}` };
  }

  const feeResult = buildTransferFeeRows({
    userId: user.id,
    occurredOn,
    ctx,
    specs: transferFeeSpecs({
      group,
      originFee: fees.origin,
      originCurrency: currency,
      originSource: source,
      destinationFee: fees.destination,
      destinationCurrency,
      destinationSource,
    }),
  });
  if (!feeResult.ok) return feeResult;
  const feeRows = feeResult.data!;

  try {
    await db.transaction(async (dbTx) => {
      await dbTx
        .insert(transactions)
        .values({ ...expense, transfer_group: group });
      await dbTx
        .insert(transactions)
        .values({ ...mirror, transfer_group: group });
      for (const row of feeRows) {
        await dbTx.insert(transactions).values(row);
      }
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Insert failed",
    };
  }
}

export async function markAsTransfer(
  txId: string,
  rawMirrorSource: string,
  opts?: MarkTransferOptions,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const mirrorSource = normalizeSource(rawMirrorSource);
  if (!mirrorSource) return { ok: false, error: "Invalid account name" };

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
  if (isWithdrawalExternalId(tx.external_id)) {
    return { ok: false, error: "A withdrawal can't be marked as a transfer" };
  }
  if (tx.budget_month) {
    return {
      ok: false,
      error: BUDGET_MONTH_LOCK_ERROR,
    };
  }
  if (mirrorSource === tx.source) {
    return { ok: false, error: "Pick a different account" };
  }
  if (kindOfSource(mirrorSource) === "api") {
    return { ok: false, error: "Can't mirror into a synced account" };
  }

  const received = opts?.received;
  if (received && received.currency === tx.currency_original) {
    return {
      ok: false,
      error: "The received amount must be in a different currency",
    };
  }

  const isExpense = tx.kind === "expense";
  const mirrorCurrency = received?.currency ?? tx.currency_original;

  const mirrorAccountCurrency = (
    await getAccountCurrencies(user.id, [mirrorSource])
  ).get(mirrorSource);
  const currencyError = transferCurrencyError({
    legCurrency: mirrorCurrency,
    accountCurrency: mirrorAccountCurrency,
    accountLabel: labelForSource(mirrorSource),
    side: isExpense ? "received" : "sent",
  });
  if (currencyError) return { ok: false, error: currencyError };

  if (received && !(received.amount > 0)) {
    return { ok: false, error: "Enter the amount received" };
  }
  const originCurrency = isExpense ? tx.currency_original : mirrorCurrency;
  const destinationCurrency = isExpense ? mirrorCurrency : tx.currency_original;

  const originFee =
    opts?.fees?.origin && opts.fees.origin > 0
      ? roundForCurrency(opts.fees.origin, originCurrency)
      : 0;
  const destinationFee =
    opts?.fees?.destination && opts.fees.destination > 0
      ? roundForCurrency(opts.fees.destination, destinationCurrency)
      : 0;

  const inTransit = isExpense
    ? roundForCurrency(tx.amount_original - originFee, tx.currency_original)
    : roundForCurrency(
        tx.amount_original + destinationFee,
        tx.currency_original,
      );
  const mirrorAmount = received
    ? roundForCurrency(
        isExpense
          ? received.amount + destinationFee
          : received.amount - originFee,
        mirrorCurrency,
      )
    : inTransit;

  const feeError = transferFeeAmountsError({
    originFee,
    originCurrency,
    originLegAmount: isExpense ? tx.amount_original : received?.amount,
    destinationFee,
    destinationCurrency,
    destinationLegAmount: isExpense ? received?.amount : tx.amount_original,
  });
  if (feeError) return { ok: false, error: feeError };
  if (inTransit <= 0 || mirrorAmount <= 0) {
    return { ok: false, error: "Fees leave nothing to transfer" };
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
      kind: isExpense ? "income" : "expense",
      amount: mirrorAmount,
      currency: mirrorCurrency,
      occurredOn: tx.occurred_on,
      note: tx.note,
      source: mirrorSource,
      externalId: `${EXTERNAL_ID_PREFIX.transfer}${tx.id}`,
    },
    ctx,
  );
  if (!mirror) {
    return { ok: false, error: `No rate for ${mirrorCurrency}` };
  }

  const feeResult = buildTransferFeeRows({
    userId: user.id,
    occurredOn: tx.occurred_on,
    ctx,
    specs: transferFeeSpecs({
      group: tx.id,
      originFee,
      originCurrency,
      originSource: isExpense ? tx.source : mirrorSource,
      destinationFee,
      destinationCurrency,
      destinationSource: isExpense ? mirrorSource : tx.source,
    }),
  });
  if (!feeResult.ok) return feeResult;
  const feeRows = feeResult.data!;

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
      for (const row of feeRows) {
        await dbTx
          .insert(transactions)
          .values(row)
          .onConflictDoNothing({
            target: [
              transactions.user_id,
              transactions.source,
              transactions.external_id,
            ],
          });
      }
      const result = await dbTx
        .update(transactions)
        .set({ transfer_group: tx.id, amount_original: inTransit })
        .where(
          and(
            eq(transactions.id, tx.id),
            eq(transactions.user_id, user.id),
            isNull(transactions.transfer_group),
          ),
        );
      if (result.rowsAffected === 0) {
        throw new Error("Transaction changed, reload and retry");
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

export async function markPairAsTransfer(
  txId1: string,
  txId2: string,
  opts?: { fees?: TransferFeeInput },
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
  if (rows.some((r) => r.budget_month)) {
    return {
      ok: false,
      error: BUDGET_MONTH_LOCK_ERROR,
    };
  }

  const [txA, txB] = rows;
  if (txA.source === txB.source) {
    return {
      ok: false,
      error: "Pick transactions from two different accounts",
    };
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
    return {
      ok: false,
      error: "Amounts don't match closely enough for a transfer",
    };
  }

  const [expenseTx, incomeTx] =
    txA.kind === "expense" ? [txA, txB] : [txB, txA];
  const sameCurrency = txA.currency_original === txB.currency_original;

  const originFee =
    opts?.fees?.origin && opts.fees.origin > 0
      ? roundForCurrency(opts.fees.origin, expenseTx.currency_original)
      : 0;
  const destinationFee =
    opts?.fees?.destination && opts.fees.destination > 0
      ? roundForCurrency(opts.fees.destination, incomeTx.currency_original)
      : 0;

  if (sameCurrency && (originFee > 0 || destinationFee > 0)) {
    const delta = roundForCurrency(
      expenseTx.amount_original - incomeTx.amount_original,
      expenseTx.currency_original,
    );
    const given = roundForCurrency(
      originFee + destinationFee,
      expenseTx.currency_original,
    );
    if (given !== delta) {
      return {
        ok: false,
        error: "The fees must add up to the difference between the amounts",
      };
    }
  }

  const expenseInTransit = roundForCurrency(
    expenseTx.amount_original - originFee,
    expenseTx.currency_original,
  );
  const incomeInTransit = roundForCurrency(
    incomeTx.amount_original + destinationFee,
    incomeTx.currency_original,
  );
  if (expenseInTransit <= 0 || incomeInTransit <= 0) {
    return { ok: false, error: "Fees leave nothing to transfer" };
  }
  const feeError = transferFeeAmountsError({
    originFee,
    originCurrency: expenseTx.currency_original,
    originLegAmount: expenseTx.amount_original,
    destinationFee,
    destinationCurrency: incomeTx.currency_original,
    destinationLegAmount: incomeTx.amount_original,
  });
  if (feeError) return { ok: false, error: feeError };

  let feeRows: TransactionInsert[] = [];
  if (originFee > 0 || destinationFee > 0) {
    const ctxResult = await withRatesErrorHandling(() =>
      buildCurrencyContext(user.id),
    );
    if (!ctxResult.ok) return ctxResult;
    if (!ctxResult.data) return { ok: false, error: "Settings not found" };

    const specs = transferFeeSpecs({
      group: txId1,
      originFee,
      originCurrency: expenseTx.currency_original,
      originSource: expenseTx.source,
      destinationFee,
      destinationCurrency: incomeTx.currency_original,
      destinationSource: incomeTx.source,
    });
    const feeResult = buildTransferFeeRows({
      userId: user.id,
      occurredOn: expenseTx.occurred_on,
      ctx: ctxResult.data,
      specs,
    });
    if (!feeResult.ok) return feeResult;
    feeRows = feeResult.data;
  }

  try {
    await db.transaction(async (dbTx) => {
      await dbTx
        .update(transactions)
        .set({ transfer_group: txId1, amount_original: expenseInTransit })
        .where(
          and(
            eq(transactions.user_id, user.id),
            eq(transactions.id, expenseTx.id),
          ),
        );
      await dbTx
        .update(transactions)
        .set({ transfer_group: txId1, amount_original: incomeInTransit })
        .where(
          and(
            eq(transactions.user_id, user.id),
            eq(transactions.id, incomeTx.id),
          ),
        );
      for (const row of feeRows) {
        await dbTx
          .insert(transactions)
          .values(row)
          .onConflictDoNothing({
            target: [
              transactions.user_id,
              transactions.source,
              transactions.external_id,
            ],
          });
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

  const group = tx.transfer_group;
  const originFeeId = `${EXTERNAL_ID_PREFIX.transferFee}${group}`;
  const destinationFeeId = `${originFeeId}${TRANSFER_FEE_DEST_SUFFIX}`;
  const isWithdrawal = linked.some((row) =>
    row.external_id?.startsWith(EXTERNAL_ID_PREFIX.withdrawal),
  );

  const feeRows = isWithdrawal
    ? []
    : await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, user.id),
            inArray(transactions.external_id, [originFeeId, destinationFeeId]),
          ),
        );

  const kept = linked.filter(
    (row) => !row.external_id?.startsWith(EXTERNAL_ID_PREFIX.transfer),
  );
  const originFeeRow = feeRows.find((row) => row.external_id === originFeeId);
  const legsAreNet = transferLegsAreNet(
    linked,
    originFeeRow?.amount_original ?? 0,
    feeRows.some((row) => row.external_id === destinationFeeId),
  );
  const restored = new Map<string, number>();
  for (const feeRow of legsAreNet ? feeRows : []) {
    const isDestination = feeRow.external_id === destinationFeeId;
    const target = kept.find(
      (row) =>
        row.source === feeRow.source &&
        row.currency_original === feeRow.currency_original &&
        row.kind === (isDestination ? "income" : "expense"),
    );
    if (!target) continue;
    const current = restored.get(target.id) ?? target.amount_original;
    restored.set(
      target.id,
      roundForCurrency(
        isDestination
          ? current - feeRow.amount_original
          : current + feeRow.amount_original,
        target.currency_original,
      ),
    );
  }

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
          const amount = restored.get(row.id);
          await dbTx
            .update(transactions)
            .set({
              transfer_group: null,
              ...(amount !== undefined ? { amount_original: amount } : {}),
            })
            .where(
              and(
                eq(transactions.id, row.id),
                eq(transactions.user_id, user.id),
              ),
            );
        }
      }
      await dbTx
        .delete(transactions)
        .where(
          and(
            eq(transactions.user_id, user.id),
            inArray(transactions.external_id, [originFeeId, destinationFeeId]),
          ),
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

export async function setBudgetMonthShift(
  txId: string,
  shift: 1 | 0,
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

  const group = budgetMonthGroupOf(tx);
  if (!group) {
    if (shift === 0 && tx.budget_month !== null) {
      try {
        await db
          .update(transactions)
          .set({ budget_month: null })
          .where(
            and(eq(transactions.id, txId), eq(transactions.user_id, user.id)),
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
    return { ok: false, error: "Only transfers and withdrawals can be moved" };
  }

  const linked = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, user.id),
        or(
          eq(transactions.transfer_group, group),
          inArray(transactions.external_id, linkedExternalIds(group)),
        ),
      ),
    );

  const anchorMonth = linked
    .reduce(
      (oldest, row) => (row.occurred_on < oldest ? row.occurred_on : oldest),
      tx.occurred_on,
    )
    .slice(0, 7);
  const target = shift === 1 ? shiftYearMonth(anchorMonth, 1) : null;

  try {
    await db.transaction(async (dbTx) => {
      for (const row of linked) {
        const value = target === row.occurred_on.slice(0, 7) ? null : target;
        await dbTx
          .update(transactions)
          .set({ budget_month: value })
          .where(
            and(
              eq(transactions.id, row.id),
              eq(transactions.user_id, user.id),
              or(
                eq(transactions.transfer_group, group),
                inArray(transactions.external_id, linkedExternalIds(group)),
              ),
            ),
          );
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
