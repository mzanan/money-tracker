"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionErrorMessage } from "@/lib/actionError";
import { isSupportedCurrency } from "@/lib/constants/currencies";
import {
  MANUAL_SOURCE,
  kindOfSource,
  normalizeSource,
  resolveSourceLabel,
} from "@/lib/constants/sources";
import { amountValidationError, formatMoney } from "@/lib/currency";
import { accountCurrencyError } from "@/lib/accountCurrencies";
import { getAccountCurrencies, getAccountLabels } from "@/lib/data/accounts";
import {
  getLedgerRecord,
  getScaleOf,
  postLedgerTransaction,
} from "@/lib/data/ledgerWrites";
import { db } from "@/lib/db";
import { feeLines, flowLines, transferPosting } from "@/lib/ledger/builders";
import {
  hasSyncedRef,
  isTransferMovement,
  isWithdrawalMovement,
} from "@/lib/ledger/edits";
import { simpleFlow } from "@/lib/ledger/movements";
import type { LedgerDraft } from "@/lib/ledger/posting";
import type { ScaleOf } from "@/lib/ledger/scale";
import {
  bankWithdrawalLine,
  exchangeRefs,
  hasCashLeg,
  withCashLeg,
  withdrawalGroupOf,
  withdrawalRef,
  withoutCashLeg,
} from "@/lib/ledger/withdrawals";
import { getUser } from "@/lib/session";
import { normalizeTags } from "@/lib/transactions";
import { resolveWithdrawalCharge, withdrawalNote } from "@/lib/withdrawal";

import type { ActionResult } from "./transactions";

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
  if (source === MANUAL_SOURCE) return "Pick a non-cash account";
  if (kindOfSource(source) === "api") {
    return "Can't withdraw from a synced account";
  }
  return null;
}

function emptyDraft(occurredOn: string): Omit<LedgerDraft, "lines"> {
  return {
    occurredOn,
    occurredAt: new Date().toISOString(),
    note: null,
    comment: null,
    tags: [],
    recurringId: null,
    isFixed: null,
    budgetMonth: null,
    externalRefs: [],
  };
}

interface WithdrawalConversion {
  source: string;
  occurredOn: string;
  note: string | null;
  receivedAmount: number;
  receivedCurrency: string;
  chargedCurrency: string;
  total: number;
  fee?: number;
}

type ConversionResult =
  | { ok: true; note: string; lines: LedgerDraft["lines"] }
  | { ok: false; error: string };

function withdrawalConversion(
  input: WithdrawalConversion,
  scaleOf: ScaleOf,
): ConversionResult {
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
  const money = { amount: converted, currency: input.chargedCurrency };
  return {
    ok: true,
    note,
    lines: [
      ...flowLines({
        kind: "expense",
        source: input.source,
        money,
        occurredOn: input.occurredOn,
        role: "withdrawal",
        scaleOf,
      }),
      ...(fee !== undefined && fee > 0
        ? feeLines(
            input.source,
            { amount: fee, currency: input.chargedCurrency },
            input.occurredOn,
            scaleOf,
          )
        : []),
    ],
  };
}

async function sourceCurrencyError(
  userId: string,
  source: string,
  currency: string,
): Promise<string | null> {
  const [accountCurrencies, accountLabels] = await Promise.all([
    getAccountCurrencies(userId, [source]),
    getAccountLabels(userId),
  ]);
  return accountCurrencyError({
    currency,
    allowed: accountCurrencies[source],
    accountLabel: resolveSourceLabel(source, accountLabels),
    side: "charged",
  });
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
  const chargedError = await sourceCurrencyError(
    user.id,
    source,
    chargedCurrency,
  );
  if (chargedError) return { ok: false, error: chargedError };

  try {
    const [accountLabels, scaleOf] = await Promise.all([
      getAccountLabels(user.id),
      getScaleOf(),
    ]);
    const id = crypto.randomUUID();
    await postLedgerTransaction(
      user.id,
      {
        ...emptyDraft(occurredOn),
        note: `Cash withdrawal from ${resolveSourceLabel(source, accountLabels)}`,
        lines: transferPosting({
          origin: source,
          destination: MANUAL_SOURCE,
          sent: { amount: converted, currency: chargedCurrency },
          received: { amount, currency },
          originFee: fee ?? 0,
          destinationFee: 0,
          sentOn: occurredOn,
          receivedOn: occurredOn,
          role: "withdrawal",
          scaleOf,
        }),
        externalRefs: [
          withdrawalRef(source, id, "out"),
          withdrawalRef(MANUAL_SOURCE, id, "in"),
        ],
      },
      { id },
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Insert failed"),
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

  try {
    const scaleOf = await getScaleOf();
    const id = crypto.randomUUID();
    await postLedgerTransaction(
      user.id,
      {
        ...emptyDraft(occurredOn),
        note: `Cash exchange ${outCurrency} → ${inCurrency}`,
        lines: transferPosting({
          origin: MANUAL_SOURCE,
          destination: MANUAL_SOURCE,
          sent: { amount: outAmount, currency: outCurrency },
          received: { amount: inAmount, currency: inCurrency },
          originFee: 0,
          destinationFee: 0,
          sentOn: occurredOn,
          receivedOn: occurredOn,
          scaleOf,
        }),
        externalRefs: exchangeRefs(id),
      },
      { id },
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Insert failed"),
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
  const chargedError = await sourceCurrencyError(
    user.id,
    source,
    chargedCurrency,
  );
  if (chargedError) return { ok: false, error: chargedError };

  try {
    const scaleOf = await getScaleOf();
    const conversion = withdrawalConversion(
      {
        source,
        occurredOn,
        note: parsed.data.note ?? null,
        receivedAmount: cashAmount,
        receivedCurrency: cashCurrency,
        chargedCurrency,
        total,
        fee: parsed.data.fee,
      },
      scaleOf,
    );
    if (!conversion.ok) return conversion;
    const id = crypto.randomUUID();
    await postLedgerTransaction(
      user.id,
      {
        ...emptyDraft(occurredOn),
        note: conversion.note,
        tags: normalizeTags(tags),
        lines: conversion.lines,
        externalRefs: [withdrawalRef(source, id)],
      },
      { id },
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Insert failed"),
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

  try {
    const record = await getLedgerRecord(user.id, id);
    if (!record) return { ok: false, error: "Transaction not found" };
    const { movement, draft } = record;
    if (isTransferMovement(movement)) {
      return { ok: false, error: "Undo the transfer first" };
    }
    if (isWithdrawalMovement(movement)) {
      return { ok: false, error: "Already a withdrawal" };
    }
    const flow = simpleFlow(movement);
    if (!flow)
      return { ok: false, error: "This movement can't be a withdrawal" };
    if (flow.kind !== "expense") {
      return { ok: false, error: "Only an expense can be a withdrawal" };
    }
    const sourceError = withdrawableSourceError(flow.source);
    if (sourceError) return { ok: false, error: sourceError };
    if (hasSyncedRef(movement)) {
      return { ok: false, error: "Synced rows can't be converted" };
    }
    const chargedError = await sourceCurrencyError(
      user.id,
      flow.source,
      chargedCurrency,
    );
    if (chargedError) return { ok: false, error: chargedError };

    const conversion = withdrawalConversion(
      {
        source: flow.source,
        occurredOn: draft.occurredOn,
        note: draft.note,
        receivedAmount: flow.amount,
        receivedCurrency: flow.currency,
        chargedCurrency,
        total,
        fee,
      },
      await getScaleOf(),
    );
    if (!conversion.ok) return conversion;
    const priorFees = draft.lines.filter((line) => line.role === "fee");
    await postLedgerTransaction(
      user.id,
      {
        ...draft,
        note: conversion.note,
        lines: [...conversion.lines, ...priorFees],
        externalRefs: [
          ...draft.externalRefs,
          withdrawalRef(flow.source, movement.id),
        ],
      },
      { replaceId: movement.id, expected: draft },
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Update failed"),
    };
  }
}

export async function undoMoveWithdrawalToCash(
  id: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    const record = await getLedgerRecord(user.id, id);
    if (!record) return { ok: false, error: "Transaction not found" };
    const { draft } = record;
    const group = withdrawalGroupOf(draft);
    if (!group || !hasCashLeg(draft) || !bankWithdrawalLine(draft)) {
      return { ok: false, error: "Not a withdrawal with a cash entry" };
    }
    await postLedgerTransaction(user.id, withoutCashLeg(draft, group), {
      replaceId: record.movement.id,
      expected: draft,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Update failed"),
    };
  }
}

const moveToCashSchema = z.object({
  id: z.string().min(1),
  cashAmount: z.number().finite().positive(),
  cashCurrency: z.string().refine(isSupportedCurrency),
});

export type MoveWithdrawalToCashInput = z.infer<typeof moveToCashSchema>;

export async function moveWithdrawalToCash(
  input: MoveWithdrawalToCashInput,
): Promise<ActionResult> {
  const parsed = moveToCashSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { id, cashAmount, cashCurrency } = parsed.data;
  const cashAmountError = amountValidationError(cashAmount, cashCurrency);
  if (cashAmountError) return { ok: false, error: cashAmountError };

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    const record = await getLedgerRecord(user.id, id);
    if (!record) return { ok: false, error: "Transaction not found" };
    const { movement, draft } = record;
    if (!isWithdrawalMovement(movement)) {
      return { ok: false, error: "Only a withdrawal can move to Cash" };
    }
    if (hasCashLeg(draft) || isTransferMovement(movement)) {
      return { ok: false, error: "This withdrawal already has a cash entry" };
    }
    if (!bankWithdrawalLine(draft)) {
      return { ok: false, error: "Only the bank side can move to Cash" };
    }
    const group = withdrawalGroupOf(draft);
    if (!group) return { ok: false, error: "Withdrawal is missing its group" };

    const next = withCashLeg(
      { ...draft, note: withdrawalNote(draft.note, cashAmount, cashCurrency) },
      group,
      { amount: cashAmount, currency: cashCurrency },
      await getScaleOf(),
    );
    await db.transaction(async (dbTx) => {
      await postLedgerTransaction(user.id, next, {
        replaceId: movement.id,
        executor: dbTx,
        expected: draft,
      });
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Update failed"),
    };
  }
}
