import { convert, feeAmountError, roundForCurrency } from "@/lib/currency";
import { EXTERNAL_ID_PREFIX, TRANSFER_FEE_DEST_SUFFIX } from "@/lib/externalIds";

import type { FxRates } from "@/types/db";

export interface TransferFeeSpec {
  amount: number;
  currency: string;
  source: string;
  externalId: string;
}

export function transferFeeSpecs({
  group,
  originFee,
  originCurrency,
  originSource,
  destinationFee,
  destinationCurrency,
  destinationSource,
}: {
  group: string;
  originFee: number;
  originCurrency: string;
  originSource: string;
  destinationFee: number;
  destinationCurrency: string;
  destinationSource: string;
}): TransferFeeSpec[] {
  return [
    {
      amount: originFee,
      currency: originCurrency,
      source: originSource,
      externalId: `${EXTERNAL_ID_PREFIX.transferFee}${group}`,
    },
    {
      amount: destinationFee,
      currency: destinationCurrency,
      source: destinationSource,
      externalId: `${EXTERNAL_ID_PREFIX.transferFee}${group}${TRANSFER_FEE_DEST_SUFFIX}`,
    },
  ].filter((spec) => spec.amount > 0);
}

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
    origin: roundForCurrency(origin, sourceCurrency),
    destination: roundForCurrency(destination, destinationCurrency),
  };
}

export function inTransitAmount(
  debited: number,
  originFee: number,
  currency: string,
): number {
  return roundForCurrency(debited - originFee, currency);
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
      credited: roundForCurrency(received.amount, received.currency),
      currency: received.currency,
      impliedRate: inTransit > 0 ? (received.amount + fees.destination) / inTransit : null,
    };
  }

  if (sourceCurrency === destinationCurrency) {
    return {
      credited: roundForCurrency(
        inTransit - fees.destination,
        destinationCurrency,
      ),
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
    credited: roundForCurrency(
      converted - fees.destination,
      destinationCurrency,
    ),
    currency: destinationCurrency,
    impliedRate: null,
  };
}
