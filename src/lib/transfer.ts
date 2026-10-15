import {
  toInputDigits,
  convert,
  feeAmountError,
  roundToScale,
} from "@/lib/currency";

import type { FxRates } from "@/types/db";

export function transferFeeAmountsError({
  originFee,
  originCurrency,
  originLegAmount,
  destinationFee,
  destinationCurrency,
  destinationLegAmount,
}: {
  originFee: number;
  originCurrency: string;
  originLegAmount?: number;
  destinationFee: number;
  destinationCurrency: string;
  destinationLegAmount?: number;
}): string | null {
  if (originFee > 0) {
    const error = feeAmountError(originFee, originCurrency, originLegAmount);
    if (error) return error;
  }
  if (destinationFee > 0) {
    const error = feeAmountError(
      destinationFee,
      destinationCurrency,
      destinationLegAmount,
    );
    if (error) return error;
  }
  return null;
}

export type FeePayer = "origin" | "destination";

export interface TransferFeeEntry {
  amount: number;
  payer: FeePayer;
}

export interface TransferFeesBySide {
  origin: number;
  destination: number;
}

export interface ReceivedAmount {
  amount: number;
  currency: string;
}

export function parseFeeDrafts(
  drafts: ReadonlyArray<{ amount: string; payer: FeePayer }>,
  parse: (raw: string) => number | null,
): TransferFeeEntry[] {
  return drafts
    .map((draft) => ({ amount: parse(draft.amount) ?? 0, payer: draft.payer }))
    .filter((fee) => fee.amount > 0);
}

export interface TransferLegShape {
  kind: "income" | "expense";
  amount_original: number;
  currency_original: string;
  external_id: string | null;
}

export function transferLegsAreNet(
  legs: ReadonlyArray<TransferLegShape>,
  originFee: number,
  hasDestinationFee: boolean,
): boolean {
  if (hasDestinationFee) return true;
  if (originFee <= 0) return true;
  const expense = legs.find((leg) => leg.kind === "expense");
  const income = legs.find((leg) => leg.kind === "income");
  if (!expense || !income) return false;
  if (expense.currency_original !== income.currency_original) return false;
  return (
    Math.abs(expense.amount_original - income.amount_original) <
    Math.abs(expense.amount_original - income.amount_original - originFee)
  );
}

export function aggregateFeesBySide(
  fees: ReadonlyArray<TransferFeeEntry>,
  sourceCurrency: string,
  destinationCurrency: string,
): TransferFeesBySide {
  let origin = 0;
  let destination = 0;
  for (const fee of fees) {
    if (!(fee.amount > 0)) continue;
    if (fee.payer === "origin") origin += fee.amount;
    else destination += fee.amount;
  }
  return {
    origin: roundToScale(origin, sourceCurrency),
    destination: roundToScale(destination, destinationCurrency),
  };
}

export function inTransitAmount(
  debited: number,
  originFee: number,
  currency: string,
): number {
  return roundToScale(debited - originFee, currency);
}

export interface CreditedPreview {
  credited: number;
  currency: string;
  impliedRate: number | null;
}

export function creditedPreview({
  debited,
  fees,
  sourceCurrency,
  destinationCurrency,
  received,
  rates,
}: {
  debited: number;
  fees: TransferFeesBySide;
  sourceCurrency: string;
  destinationCurrency: string;
  received?: ReceivedAmount | null;
  rates: FxRates | null;
}): CreditedPreview | null {
  const inTransit = inTransitAmount(debited, fees.origin, sourceCurrency);
  if (!(inTransit > 0)) return null;

  if (received && received.amount > 0) {
    return {
      credited: roundToScale(received.amount, received.currency),
      currency: received.currency,
      impliedRate:
        inTransit > 0 ? (received.amount + fees.destination) / inTransit : null,
    };
  }

  if (sourceCurrency === destinationCurrency) {
    return {
      credited: roundToScale(inTransit - fees.destination, destinationCurrency),
      currency: destinationCurrency,
      impliedRate: null,
    };
  }

  if (!rates) return null;
  let converted: number;
  try {
    converted = convert(inTransit, sourceCurrency, destinationCurrency, rates);
  } catch {
    return null;
  }
  return {
    credited: roundToScale(converted - fees.destination, destinationCurrency),
    currency: destinationCurrency,
    impliedRate: null,
  };
}

export function receivedFieldLabel(
  isIncome: boolean,
  required: boolean,
): string {
  const base = isIncome ? "Amount sent" : "Amount received";
  return required ? base : `${base}, optional`;
}

export function creditCurrencies(
  sentCurrency: string,
  available: ReadonlyArray<string>,
): string[] {
  return available.includes(sentCurrency)
    ? [...available]
    : [sentCurrency, ...available];
}

export function creditReceivedDefault(
  sent: { amount: number; currency: string },
  receivedCurrency: string,
  fee: number,
): string {
  if (receivedCurrency !== sent.currency) return "";
  const net = roundToScale(sent.amount - fee, sent.currency);
  return net > 0 ? toInputDigits(net, sent.currency) : "";
}

export function creditDateError(
  sentOn: string,
  creditedOn: string | null,
): string | null {
  return creditedOn !== null && creditedOn < sentOn
    ? "The credit date can't be before the send date"
    : null;
}

export function clampCreditDate(date: string, sentOn: string): string {
  return date < sentOn ? sentOn : date;
}

export function pairFeeTarget(
  expense: { amount: number; currency: string },
  income: { amount: number; currency: string },
): number {
  if (expense.currency !== income.currency) return 0;
  return Math.max(0, pairAmountDelta(expense, income));
}

export const INCOME_EXCEEDS_EXPENSE_ERROR =
  "The income is larger than the expense, so they can't be one transfer.";

export function pairIncomeExceedsExpense(
  expense: { amount: number; currency: string },
  income: { amount: number; currency: string },
): boolean {
  return (
    expense.currency === income.currency && pairAmountDelta(expense, income) < 0
  );
}

export function pairAmountDelta(
  expense: { amount: number; currency: string },
  income: { amount: number },
): number {
  return roundToScale(expense.amount - income.amount, expense.currency);
}
