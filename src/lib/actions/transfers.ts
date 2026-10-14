"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionErrorMessage } from "@/lib/actionError";
import { isSupportedCurrency } from "@/lib/constants/currencies";
import { BUDGET_MONTH_LOCK_ERROR } from "@/lib/budgetMonth";
import { db } from "@/lib/db";
import { accountCurrencyError } from "@/lib/accountCurrencies";
import { getAccountCurrencies } from "@/lib/data/accounts";
import {
  deleteLedgerTransactions,
  getLedgerRecord,
  getLedgerRecords,
  getScaleOf,
  postLedgerTransaction,
} from "@/lib/data/ledgerWrites";
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
import { isValidCalendarDate, shiftYearMonth } from "@/lib/dates";
import { transferPosting } from "@/lib/ledger/builders";
import {
  feeOnlyDraft,
  isBudgetShiftable,
  isTransferMovement,
  isWithdrawalMovement,
  mirrorRef,
  splitTransfer,
} from "@/lib/ledger/edits";
import { simpleFlow } from "@/lib/ledger/movements";
import {
  aggregateFeesBySide,
  creditDateError,
  inTransitAmount,
  transferFeeAmountsError,
  type ReceivedAmount,
  type TransferFeeEntry,
} from "@/lib/transfer";
import {
  buildCurrencyContext,
  withRatesErrorHandling,
} from "@/lib/currencyContext";
import { getUser } from "@/lib/session";
import { manualFeeNote, normalizeTags } from "@/lib/transactions";
import type { FxRates } from "@/types/db";

import type { ActionResult } from "./transactions";

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
  receivedOn?: string | null;
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
  receivedOn: z.iso.date("Invalid date (yyyy-MM-dd)").nullable().optional(),
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
  const { amount, currency, occurredOn, tags } = parsed.data;
  const receivedOn =
    parsed.data.receivedOn === undefined ? occurredOn : parsed.data.receivedOn;
  const pending = receivedOn === null;
  const received = pending ? undefined : parsed.data.received;
  const recordDateError = creditDateError(occurredOn, receivedOn);
  if (recordDateError) return { ok: false, error: recordDateError };

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
  const originError = accountCurrencyError({
    currency,
    allowed: accountCurrencies[source],
    accountLabel: labelForSource(source),
    side: "sent",
  });
  if (originError) return { ok: false, error: originError };
  const destinationError = pending
    ? null
    : accountCurrencyError({
        currency: destinationCurrency,
        allowed: accountCurrencies[destinationSource],
        accountLabel: labelForSource(destinationSource),
        side: "received",
      });
  if (destinationError) return { ok: false, error: destinationError };

  try {
    const scaleOf = await getScaleOf();
    const id = crypto.randomUUID();
    await postLedgerTransaction(
      user.id,
      {
        occurredOn,
        occurredAt: new Date().toISOString(),
        note: parsed.data.note?.trim() || null,
        comment: null,
        tags: normalizeTags(tags),
        recurringId: null,
        isFixed: null,
        budgetMonth: null,
        transitDestination: pending ? destinationSource : null,
        lines: transferPosting({
          origin: source,
          destination: destinationSource,
          sent: { amount: inTransit, currency },
          received: { amount: mirrorAmount, currency: destinationCurrency },
          originFee: fees.origin,
          destinationFee: fees.destination,
          sentOn: occurredOn,
          receivedOn,
          scaleOf,
        }),
        externalRefs: [mirrorRef(destinationSource, id)],
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

export async function markAsTransfer(
  txId: string,
  rawMirrorSource: string,
  opts?: MarkTransferOptions,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const mirrorSource = normalizeSource(rawMirrorSource);
  if (!mirrorSource) return { ok: false, error: "Invalid account name" };

  const record = await getLedgerRecord(user.id, txId);
  if (!record) return { ok: false, error: "Transaction not found" };
  const { movement, draft } = record;
  if (isTransferMovement(movement)) {
    return { ok: false, error: "Already marked as a transfer" };
  }
  if (isWithdrawalMovement(movement)) {
    return { ok: false, error: "A withdrawal can't be marked as a transfer" };
  }
  if (draft.budgetMonth) {
    return {
      ok: false,
      error: BUDGET_MONTH_LOCK_ERROR,
    };
  }
  const flow = simpleFlow(movement);
  if (!flow) return { ok: false, error: "Transaction not found" };
  if (mirrorSource === flow.source) {
    return { ok: false, error: "Pick a different account" };
  }
  if (kindOfSource(mirrorSource) === "api") {
    return { ok: false, error: "Can't mirror into a synced account" };
  }

  const isExpense = flow.kind === "expense";
  const receivedOn =
    opts?.receivedOn === undefined || !isExpense
      ? draft.occurredOn
      : opts.receivedOn;
  if (receivedOn !== null && !isValidCalendarDate(receivedOn)) {
    return { ok: false, error: "Invalid date" };
  }
  const markDateError = creditDateError(draft.occurredOn, receivedOn);
  if (markDateError) return { ok: false, error: markDateError };
  const pending = receivedOn === null;
  const received = pending ? undefined : opts?.received;
  if (received && received.currency === flow.currency) {
    return {
      ok: false,
      error: "The received amount must be in a different currency",
    };
  }

  const mirrorCurrency = received?.currency ?? flow.currency;

  const legCurrencies = await getAccountCurrencies(user.id, [
    mirrorSource,
    flow.source,
  ]);
  const currencyError =
    (pending
      ? null
      : accountCurrencyError({
          currency: mirrorCurrency,
          allowed: legCurrencies[mirrorSource],
          accountLabel: labelForSource(mirrorSource),
          side: isExpense ? "received" : "sent",
        })) ??
    accountCurrencyError({
      currency: flow.currency,
      allowed: legCurrencies[flow.source],
      accountLabel: labelForSource(flow.source),
      side: "own",
    });
  if (currencyError) return { ok: false, error: currencyError };

  if (received && !(received.amount > 0)) {
    return { ok: false, error: "Enter the amount received" };
  }
  const originCurrency = isExpense ? flow.currency : mirrorCurrency;
  const destinationCurrency = isExpense ? mirrorCurrency : flow.currency;

  const originFee =
    opts?.fees?.origin && opts.fees.origin > 0
      ? roundForCurrency(opts.fees.origin, originCurrency)
      : 0;
  const destinationFee =
    opts?.fees?.destination && opts.fees.destination > 0
      ? roundForCurrency(opts.fees.destination, destinationCurrency)
      : 0;

  const inTransit = isExpense
    ? roundForCurrency(flow.amount - originFee, flow.currency)
    : roundForCurrency(flow.amount + destinationFee, flow.currency);
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
    originLegAmount: isExpense ? flow.amount : received?.amount,
    destinationFee,
    destinationCurrency,
    destinationLegAmount: isExpense ? received?.amount : flow.amount,
  });
  if (feeError) return { ok: false, error: feeError };
  if (inTransit <= 0 || mirrorAmount <= 0) {
    return { ok: false, error: "Fees leave nothing to transfer" };
  }

  try {
    const scaleOf = await getScaleOf();
    const own = { amount: inTransit, currency: flow.currency };
    const mirror = { amount: mirrorAmount, currency: mirrorCurrency };
    const lines = transferPosting({
      origin: isExpense ? flow.source : mirrorSource,
      destination: isExpense ? mirrorSource : flow.source,
      sent: isExpense ? own : mirror,
      received: isExpense ? mirror : own,
      originFee,
      destinationFee,
      sentOn: draft.occurredOn,
      receivedOn,
      scaleOf,
    });
    const splitFee = feeOnlyDraft(draft, manualFeeNote(draft.note));
    await db.transaction(async (dbTx) => {
      await postLedgerTransaction(
        user.id,
        {
          ...draft,
          transitDestination: pending ? mirrorSource : null,
          lines,
          externalRefs: [
            ...draft.externalRefs,
            mirrorRef(mirrorSource, movement.id),
          ],
        },
        { replaceId: movement.id, executor: dbTx, expected: draft.lines },
      );
      if (splitFee) {
        await postLedgerTransaction(user.id, splitFee, { executor: dbTx });
      }
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

  const records = await getLedgerRecords(user.id, [txId1, txId2]);
  const recordA = records.get(txId1);
  const recordB = records.get(txId2);
  if (!recordA || !recordB) {
    return { ok: false, error: "Transaction not found" };
  }
  if ([recordA, recordB].some((r) => isTransferMovement(r.movement))) {
    return { ok: false, error: "Already marked as a transfer" };
  }
  if ([recordA, recordB].some((r) => r.draft.budgetMonth)) {
    return {
      ok: false,
      error: BUDGET_MONTH_LOCK_ERROR,
    };
  }
  const flowA = simpleFlow(recordA.movement);
  const flowB = simpleFlow(recordB.movement);
  if (!flowA || !flowB) return { ok: false, error: "Transaction not found" };

  if (flowA.source === flowB.source) {
    return {
      ok: false,
      error: "Pick transactions from two different accounts",
    };
  }
  if (flowA.kind === flowB.kind) {
    return { ok: false, error: "Pick one income and one expense" };
  }
  const pairCurrencies = await getAccountCurrencies(user.id, [
    flowA.source,
    flowB.source,
  ]);
  const pairCurrencyError = [flowA, flowB]
    .map((flow) =>
      accountCurrencyError({
        currency: flow.currency,
        allowed: pairCurrencies[flow.source],
        accountLabel: labelForSource(flow.source),
        side: "own",
      }),
    )
    .find(Boolean);
  if (pairCurrencyError) return { ok: false, error: pairCurrencyError };

  let rates: FxRates | null = null;
  if (flowA.currency !== flowB.currency) {
    const ctxResult = await withRatesErrorHandling(() =>
      buildCurrencyContext(user.id),
    );
    if (!ctxResult.ok) return ctxResult;
    if (!ctxResult.data) return { ok: false, error: "Settings not found" };
    rates = ctxResult.data.rates;
  }

  if (
    !transferAmountsMatch(
      { amount: flowA.amount, currency: flowA.currency },
      { amount: flowB.amount, currency: flowB.currency },
      rates,
    )
  ) {
    return {
      ok: false,
      error: "Amounts don't match closely enough for a transfer",
    };
  }

  const [expense, income] =
    flowA.kind === "expense"
      ? [
          { flow: flowA, record: recordA },
          { flow: flowB, record: recordB },
        ]
      : [
          { flow: flowB, record: recordB },
          { flow: flowA, record: recordA },
        ];
  const sameCurrency = flowA.currency === flowB.currency;

  const originFee =
    opts?.fees?.origin && opts.fees.origin > 0
      ? roundForCurrency(opts.fees.origin, expense.flow.currency)
      : 0;
  const destinationFee =
    opts?.fees?.destination && opts.fees.destination > 0
      ? roundForCurrency(opts.fees.destination, income.flow.currency)
      : 0;

  if (sameCurrency) {
    const delta = roundForCurrency(
      expense.flow.amount - income.flow.amount,
      expense.flow.currency,
    );
    const given = roundForCurrency(
      originFee + destinationFee,
      expense.flow.currency,
    );
    if (given !== delta) {
      return {
        ok: false,
        error:
          given === 0
            ? "The amounts differ: enter the difference as a fee"
            : "The fees must add up to the difference between the amounts",
      };
    }
  }

  const expenseInTransit = roundForCurrency(
    expense.flow.amount - originFee,
    expense.flow.currency,
  );
  const incomeInTransit = roundForCurrency(
    income.flow.amount + destinationFee,
    income.flow.currency,
  );
  if (expenseInTransit <= 0 || incomeInTransit <= 0) {
    return { ok: false, error: "Fees leave nothing to transfer" };
  }
  const feeError = transferFeeAmountsError({
    originFee,
    originCurrency: expense.flow.currency,
    originLegAmount: expense.flow.amount,
    destinationFee,
    destinationCurrency: income.flow.currency,
    destinationLegAmount: income.flow.amount,
  });
  if (feeError) return { ok: false, error: feeError };

  try {
    const scaleOf = await getScaleOf();
    const keep = expense.record.draft;
    const other = income.record.draft;
    const lines = transferPosting({
      origin: expense.flow.source,
      destination: income.flow.source,
      sent: { amount: expenseInTransit, currency: expense.flow.currency },
      received: { amount: incomeInTransit, currency: income.flow.currency },
      originFee,
      destinationFee,
      sentOn: keep.occurredOn,
      receivedOn: other.occurredOn,
      scaleOf,
    });
    const splitFees = [keep, other].flatMap((source) => {
      const fee = feeOnlyDraft(source, manualFeeNote(source.note));
      return fee ? [fee] : [];
    });
    const keepId = expense.record.movement.id;
    await db.transaction(async (dbTx) => {
      await deleteLedgerTransactions(
        user.id,
        [income.record.movement.id],
        dbTx,
      );
      await postLedgerTransaction(
        user.id,
        {
          ...keep,
          note: keep.note ?? other.note,
          comment: keep.comment ?? other.comment,
          tags: normalizeTags([...keep.tags, ...other.tags]),
          recurringId: keep.recurringId ?? other.recurringId,
          isFixed: keep.isFixed ?? other.isFixed,
          lines,
          externalRefs: [...keep.externalRefs, ...other.externalRefs],
        },
        { replaceId: keepId, executor: dbTx, expected: keep.lines },
      );
      for (const fee of splitFees) {
        await postLedgerTransaction(user.id, fee, { executor: dbTx });
      }
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

export async function unmarkTransfer(txId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const record = await getLedgerRecord(user.id, txId);
  if (!record || !isTransferMovement(record.movement)) {
    return { ok: false, error: "Not a transfer" };
  }

  const [first, ...rest] = splitTransfer(record.draft);
  if (!first) return { ok: false, error: "Not a transfer" };

  try {
    await db.transaction(async (dbTx) => {
      await postLedgerTransaction(user.id, first, {
        replaceId: record.movement.id,
        executor: dbTx,
      });
      for (const draft of rest) {
        await postLedgerTransaction(user.id, draft, { executor: dbTx });
      }
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

export async function setBudgetMonthShift(
  txId: string,
  shift: 1 | 0,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const record = await getLedgerRecord(user.id, txId);
  if (!record) return { ok: false, error: "Transaction not found" };
  const { movement, draft } = record;

  let budgetMonth: string | null = null;
  if (isBudgetShiftable(movement)) {
    const anchor = draft.lines
      .reduce(
        (oldest, line) => (line.occurredOn < oldest ? line.occurredOn : oldest),
        draft.occurredOn,
      )
      .slice(0, 7);
    budgetMonth = shift === 1 ? shiftYearMonth(anchor, 1) : null;
  } else if (shift === 1 || draft.budgetMonth === null) {
    return { ok: false, error: "Only transfers and withdrawals can be moved" };
  }

  try {
    await postLedgerTransaction(
      user.id,
      { ...draft, budgetMonth },
      { replaceId: movement.id },
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
