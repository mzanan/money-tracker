"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { and, eq, isNull } from "drizzle-orm";

import { isSupportedCurrency } from "@/lib/constants/currencies";
import {
  kindOfSource,
  normalizeSource,
  resolveSourceLabel,
} from "@/lib/constants/sources";
import { amountValidationError, formatMoney } from "@/lib/currency";
import { getAccountLabels } from "@/lib/data/accounts";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import {
  EXTERNAL_ID_PREFIX,
  isSyncedExternalId,
  isWithdrawalExternalId,
} from "@/lib/externalIds";
import { getUser } from "@/lib/session";
import {
  buildFeeRow,
  buildTransactionRow,
  type BuildContext,
} from "@/lib/transactions";
import { resolveWithdrawalCharge } from "@/lib/withdrawal";
import type { TransactionInsert } from "@/types/db";

import {
  buildCurrencyContext,
  withRatesErrorHandling,
  type ActionResult,
} from "./transactions";

const withdrawalSchema = z.object({
  amount: z.number().finite().positive(),
  currency: z.string().refine(isSupportedCurrency),
  source: z.string().min(1),
  occurredOn: z.iso.date("Invalid date (yyyy-MM-dd)"),
  chargedCurrency: z.string().refine(isSupportedCurrency),
  total: z.number().finite().positive().optional(),
  rate: z.number().finite().positive().optional(),
  fee: z.number().finite().nonnegative().optional(),
});

export type CashWithdrawalInput = z.infer<typeof withdrawalSchema>;

function withdrawableSourceError(source: string): string | null {
  if (source === "manual") return "Pick a non-cash account";
  if (kindOfSource(source) === "api") {
    return "Can't withdraw from a synced account";
  }
  return null;
}

function buildWithdrawalFeeRow(
  input: {
    userId: string;
    fee: number;
    currency: string;
    occurredOn: string;
    source: string;
    group: string;
  },
  ctx: BuildContext,
): TransactionInsert | null {
  return buildFeeRow(
    {
      userId: input.userId,
      amount: input.fee,
      currency: input.currency,
      occurredOn: input.occurredOn,
      note: "Withdrawal fee",
      source: input.source,
      externalId: `${EXTERNAL_ID_PREFIX.transferFee}${input.group}`,
    },
    ctx,
  );
}

interface WithdrawalConversionInput {
  userId: string;
  source: string;
  occurredOn: string;
  tags?: string[];
  note: string | null;
  receivedAmount: number;
  receivedCurrency: string;
  chargedCurrency: string;
  total: number;
  fee?: number;
  externalId: string;
  group: string;
}

function buildWithdrawalConversion(
  input: WithdrawalConversionInput,
  ctx: BuildContext,
):
  | { ok: true; row: TransactionInsert; feeRow: TransactionInsert | null }
  | { ok: false; error: string } {
  const totalAmountError = amountValidationError(
    input.total,
    input.chargedCurrency,
  );
  if (totalAmountError) return { ok: false, error: totalAmountError };

  const charge = resolveWithdrawalCharge({
    received: input.receivedAmount,
    receivedCurrency: input.receivedCurrency,
    chargedCurrency: input.chargedCurrency,
    total: input.total,
    fee: input.fee,
  });
  if (!charge.ok) return { ok: false, error: charge.error };
  const { converted, fee } = charge;

  const base = input.note?.trim() || "ATM withdrawal";
  const note = `${base} · ${formatMoney(input.receivedAmount, input.receivedCurrency, { showCode: true })}`;
  const row = buildTransactionRow(
    {
      userId: input.userId,
      kind: "expense",
      amount: converted,
      currency: input.chargedCurrency,
      occurredOn: input.occurredOn,
      tags: input.tags,
      note,
      source: input.source,
      externalId: input.externalId,
    },
    ctx,
  );
  if (!row) {
    return { ok: false, error: `No rate for ${input.chargedCurrency}` };
  }

  let feeRow: TransactionInsert | null = null;
  if (fee !== undefined && fee > 0) {
    feeRow = buildWithdrawalFeeRow(
      {
        userId: input.userId,
        fee,
        currency: input.chargedCurrency,
        occurredOn: input.occurredOn,
        source: input.source,
        group: input.group,
      },
      ctx,
    );
    if (!feeRow) {
      return { ok: false, error: `No rate for ${input.chargedCurrency}` };
    }
  }

  return { ok: true, row, feeRow };
}

export async function recordCashWithdrawal(
  input: CashWithdrawalInput,
): Promise<ActionResult> {
  const parsed = withdrawalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { amount, currency, source, occurredOn, chargedCurrency, total, rate } =
    parsed.data;
  const sourceError = withdrawableSourceError(source);
  if (sourceError) return { ok: false, error: sourceError };
  const withdrawalAmountError = amountValidationError(amount, currency);
  if (withdrawalAmountError) {
    return { ok: false, error: withdrawalAmountError };
  }
  if (
    chargedCurrency !== currency &&
    total === undefined &&
    rate === undefined
  ) {
    return { ok: false, error: "Enter the total charged or the exchange rate" };
  }
  const charge = resolveWithdrawalCharge({
    received: amount,
    receivedCurrency: currency,
    chargedCurrency,
    total,
    rate,
    fee: parsed.data.fee,
  });
  if (!charge.ok) return { ok: false, error: charge.error };
  const { converted, fee } = charge;

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const ctxResult = await withRatesErrorHandling(() =>
    buildCurrencyContext(user.id),
  );
  if (!ctxResult.ok) return ctxResult;
  const ctx = ctxResult.data;
  if (!ctx) return { ok: false, error: "Settings not found" };

  const accountLabels = await getAccountLabels(user.id);
  const group = crypto.randomUUID();
  const note = `Cash withdrawal from ${resolveSourceLabel(source, accountLabels)}`;
  const out = buildTransactionRow(
    {
      userId: user.id,
      kind: "expense",
      amount: converted,
      currency: chargedCurrency,
      occurredOn,
      note,
      source,
      externalId: `${EXTERNAL_ID_PREFIX.withdrawal}${group}:out`,
    },
    ctx,
  );
  const incoming = buildTransactionRow(
    {
      userId: user.id,
      kind: "income",
      amount,
      currency,
      occurredOn,
      note,
      externalId: `${EXTERNAL_ID_PREFIX.withdrawal}${group}:in`,
    },
    ctx,
  );
  if (!out || !incoming) {
    return { ok: false, error: `No rate for ${currency}` };
  }

  let feeRow: TransactionInsert | null = null;
  if (fee !== undefined && fee > 0) {
    feeRow = buildWithdrawalFeeRow(
      {
        userId: user.id,
        fee,
        currency: chargedCurrency,
        occurredOn,
        source,
        group,
      },
      ctx,
    );
    if (!feeRow) {
      return { ok: false, error: `No rate for ${chargedCurrency}` };
    }
  }

  try {
    await db
      .insert(transactions)
      .values([
        { ...out, transfer_group: group },
        { ...incoming, transfer_group: group },
        ...(feeRow ? [feeRow] : []),
      ]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Insert failed",
    };
  }
}

const exchangeSchema = z.object({
  outAmount: z.number().finite().positive(),
  outCurrency: z.string().refine(isSupportedCurrency),
  inAmount: z.number().finite().positive(),
  inCurrency: z.string().refine(isSupportedCurrency),
  occurredOn: z.iso.date("Invalid date (yyyy-MM-dd)"),
});

export type CashExchangeInput = z.infer<typeof exchangeSchema>;

export async function recordCashExchange(
  input: CashExchangeInput,
): Promise<ActionResult> {
  const parsed = exchangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { outAmount, outCurrency, inAmount, inCurrency, occurredOn } =
    parsed.data;
  if (outCurrency === inCurrency) {
    return { ok: false, error: "Pick two different currencies" };
  }
  for (const [amount, currency] of [
    [outAmount, outCurrency],
    [inAmount, inCurrency],
  ] as const) {
    const exchangeAmountError = amountValidationError(amount, currency);
    if (exchangeAmountError) {
      return { ok: false, error: exchangeAmountError };
    }
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const ctxResult = await withRatesErrorHandling(() =>
    buildCurrencyContext(user.id),
  );
  if (!ctxResult.ok) return ctxResult;
  const ctx = ctxResult.data;
  if (!ctx) return { ok: false, error: "Settings not found" };

  const group = crypto.randomUUID();
  const note = `Cash exchange ${outCurrency} → ${inCurrency}`;
  const out = buildTransactionRow(
    {
      userId: user.id,
      kind: "expense",
      amount: outAmount,
      currency: outCurrency,
      occurredOn,
      note,
      externalId: `${EXTERNAL_ID_PREFIX.exchange}${group}:out`,
    },
    ctx,
  );
  const incoming = buildTransactionRow(
    {
      userId: user.id,
      kind: "income",
      amount: inAmount,
      currency: inCurrency,
      occurredOn,
      note,
      externalId: `${EXTERNAL_ID_PREFIX.exchange}${group}:in`,
    },
    ctx,
  );
  if (!out || !incoming) {
    return { ok: false, error: "No rate for one of the currencies" };
  }

  try {
    await db.insert(transactions).values([
      { ...out, transfer_group: group },
      { ...incoming, transfer_group: group },
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Insert failed",
    };
  }
}

const withdrawalExpenseSchema = z.object({
  cashAmount: z.number().finite().positive(),
  cashCurrency: z.string().refine(isSupportedCurrency),
  chargedCurrency: z.string().refine(isSupportedCurrency),
  total: z.number().finite().positive(),
  fee: z.number().finite().nonnegative().optional(),
  source: z.string().trim().min(1).max(32),
  occurredOn: z.iso.date("Invalid date (yyyy-MM-dd)"),
  note: z.string().trim().max(280).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

export type WithdrawalExpenseInput = z.infer<typeof withdrawalExpenseSchema>;

export async function recordWithdrawalExpense(
  input: WithdrawalExpenseInput,
): Promise<ActionResult> {
  const parsed = withdrawalExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { cashAmount, cashCurrency, chargedCurrency, total, occurredOn, tags } =
    parsed.data;
  const source = normalizeSource(parsed.data.source);
  if (!source) return { ok: false, error: "Invalid source" };
  const sourceError = withdrawableSourceError(source);
  if (sourceError) return { ok: false, error: sourceError };
  const cashAmountError = amountValidationError(cashAmount, cashCurrency);
  if (cashAmountError) {
    return { ok: false, error: cashAmountError };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const ctxResult = await withRatesErrorHandling(() =>
    buildCurrencyContext(user.id),
  );
  if (!ctxResult.ok) return ctxResult;
  const ctx = ctxResult.data;
  if (!ctx) return { ok: false, error: "Settings not found" };

  const group = crypto.randomUUID();
  const conversion = buildWithdrawalConversion(
    {
      userId: user.id,
      source,
      occurredOn,
      tags,
      note: parsed.data.note ?? null,
      receivedAmount: cashAmount,
      receivedCurrency: cashCurrency,
      chargedCurrency,
      total,
      fee: parsed.data.fee,
      externalId: `${EXTERNAL_ID_PREFIX.withdrawal}${group}`,
      group,
    },
    ctx,
  );
  if (!conversion.ok) return conversion;
  const { row: expense, feeRow } = conversion;

  try {
    await db
      .insert(transactions)
      .values([expense, ...(feeRow ? [feeRow] : [])]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Insert failed",
    };
  }
}

const convertToWithdrawalSchema = z.object({
  id: z.string().min(1),
  chargedCurrency: z.string().refine(isSupportedCurrency),
  total: z.number().finite().positive(),
  fee: z.number().finite().nonnegative().optional(),
});

export type ConvertToWithdrawalInput = z.infer<
  typeof convertToWithdrawalSchema
>;

export async function convertToWithdrawal(
  input: ConvertToWithdrawalInput,
): Promise<ActionResult> {
  const parsed = convertToWithdrawalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { id, chargedCurrency, total, fee } = parsed.data;

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
    return { ok: false, error: "Undo the transfer first" };
  }
  if (isWithdrawalExternalId(tx.external_id)) {
    return { ok: false, error: "Already a withdrawal" };
  }
  if (tx.external_id?.startsWith(EXTERNAL_ID_PREFIX.transferFee)) {
    return { ok: false, error: "A fee row can't be a withdrawal" };
  }
  if (tx.kind !== "expense") {
    return { ok: false, error: "Only an expense can be a withdrawal" };
  }
  const sourceError = withdrawableSourceError(tx.source);
  if (sourceError) return { ok: false, error: sourceError };
  if (isSyncedExternalId(tx.external_id)) {
    return { ok: false, error: "Synced rows can't be converted" };
  }

  const ctxResult = await withRatesErrorHandling(() =>
    buildCurrencyContext(user.id),
  );
  if (!ctxResult.ok) return ctxResult;
  const ctx = ctxResult.data;
  if (!ctx) return { ok: false, error: "Settings not found" };

  const group = crypto.randomUUID();
  const conversion = buildWithdrawalConversion(
    {
      userId: user.id,
      source: tx.source,
      occurredOn: tx.occurred_on,
      note: tx.note,
      receivedAmount: tx.amount_original,
      receivedCurrency: tx.currency_original,
      chargedCurrency,
      total,
      fee,
      externalId: `${EXTERNAL_ID_PREFIX.withdrawal}${group}`,
      group,
    },
    ctx,
  );
  if (!conversion.ok) return conversion;
  const { row, feeRow } = conversion;

  const externalIdGuard =
    tx.external_id === null
      ? isNull(transactions.external_id)
      : eq(transactions.external_id, tx.external_id);

  try {
    await db.transaction(async (dbTx) => {
      const result = await dbTx
        .update(transactions)
        .set({
          amount_original: row.amount_original,
          currency_original: row.currency_original,
          fx_rates_snapshot: row.fx_rates_snapshot,
          note: row.note,
          external_id: row.external_id,
        })
        .where(
          and(
            eq(transactions.id, id),
            eq(transactions.user_id, user.id),
            isNull(transactions.transfer_group),
            externalIdGuard,
          ),
        );
      if (result.rowsAffected === 0) {
        throw new Error("Transaction changed, reload and retry");
      }
      if (feeRow) {
        await dbTx.insert(transactions).values(feeRow);
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
