"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupportedCurrency } from "@/lib/constants/currencies";
import { kindOfSource, resolveSourceLabel } from "@/lib/constants/sources";
import {
  amountValidationError,
  feeAmountError,
  roundForCurrency,
} from "@/lib/currency";
import { getAccountLabels } from "@/lib/data/accounts";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";
import {
  buildFeeRow,
  buildTransactionRow,
  EXTERNAL_ID_PREFIX,
} from "@/lib/transactions";
import { withdrawalChargedAmount } from "@/lib/withdrawal";
import type { TransactionInsert } from "@/types/db";

import { buildCurrencyContext, type ActionResult } from "./transactions";

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

export async function recordCashWithdrawal(
  input: CashWithdrawalInput,
): Promise<ActionResult> {
  const parsed = withdrawalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { amount, currency, source, occurredOn, chargedCurrency, total, rate } =
    parsed.data;
  if (source === "manual") {
    return { ok: false, error: "Pick a non-cash account" };
  }
  if (kindOfSource(source) === "api") {
    return { ok: false, error: "Can't withdraw from a synced account" };
  }
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
  let fee = parsed.data.fee;
  if (fee !== undefined) {
    fee = roundForCurrency(fee, chargedCurrency);
    if (fee > 0) {
      const withdrawalFeeError = feeAmountError(fee, chargedCurrency, total);
      if (withdrawalFeeError) {
        return { ok: false, error: withdrawalFeeError };
      }
    }
  }
  const converted = withdrawalChargedAmount({
    received: amount,
    receivedCurrency: currency,
    chargedCurrency,
    total,
    rate,
    fee,
  });
  if (converted === null) {
    return { ok: false, error: "Charged amount must be greater than the fee" };
  }
  const convertedAmountError = amountValidationError(
    converted,
    chargedCurrency,
  );
  if (convertedAmountError) {
    return { ok: false, error: convertedAmountError };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  let ctx;
  try {
    ctx = await buildCurrencyContext(user.id);
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return { ok: false, error: "Exchange rates unavailable. Try again." };
    }
    return { ok: false, error: "Error fetching rates" };
  }
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
    feeRow = buildFeeRow(
      {
        userId: user.id,
        amount: fee,
        currency: chargedCurrency,
        occurredOn,
        note: "Withdrawal fee",
        source,
        externalId: `${EXTERNAL_ID_PREFIX.transferFee}${group}`,
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

  let ctx;
  try {
    ctx = await buildCurrencyContext(user.id);
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return { ok: false, error: "Exchange rates unavailable. Try again." };
    }
    return { ok: false, error: "Error fetching rates" };
  }
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
