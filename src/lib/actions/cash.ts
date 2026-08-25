"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
import { getUser } from "@/lib/session";
import {
  buildFeeRow,
  buildTransactionRow,
  EXTERNAL_ID_PREFIX,
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
  const totalAmountError = amountValidationError(total, chargedCurrency);
  if (totalAmountError) {
    return { ok: false, error: totalAmountError };
  }
  const charge = resolveWithdrawalCharge({
    received: cashAmount,
    receivedCurrency: cashCurrency,
    chargedCurrency,
    total,
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

  const group = crypto.randomUUID();
  const base = parsed.data.note?.trim() || "ATM withdrawal";
  const note = `${base} · ${formatMoney(cashAmount, cashCurrency, { showCode: true })}`;
  const expense = buildTransactionRow(
    {
      userId: user.id,
      kind: "expense",
      amount: converted,
      currency: chargedCurrency,
      occurredOn,
      tags,
      note,
      source,
      externalId: `${EXTERNAL_ID_PREFIX.withdrawal}${group}`,
    },
    ctx,
  );
  if (!expense) {
    return { ok: false, error: `No rate for ${chargedCurrency}` };
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
