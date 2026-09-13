import {
  amountValidationError,
  feeAmountError,
  formatMoney,
  roundForCurrency,
} from "@/lib/currency";

export const RATE_DECIMALS = 4;

const NOTE_CASH_PATTERN = /([\d,]+(?:\.\d+)?)\s+([A-Z]{3})\s*$/;

export interface WithdrawnCash {
  amount: number;
  currency: string;
}

export function cashFromWithdrawalNote(
  note: string | null | undefined,
): WithdrawnCash | null {
  const match = note?.match(NOTE_CASH_PATTERN);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, currency: match[2] };
}

export function withdrawalNote(
  note: string | null | undefined,
  amount: number,
  currency: string,
): string {
  const raw = note?.trim() ?? "";
  const separator = raw.lastIndexOf("·");
  const suffix = separator === -1 ? null : raw.slice(separator + 1);
  const stripped =
    suffix !== null && cashFromWithdrawalNote(suffix)
      ? raw.slice(0, separator).trim()
      : raw;
  const base = stripped || "ATM withdrawal";
  return `${base} · ${formatMoney(amount, currency, { showCode: true })}`;
}

export interface WithdrawalChargedAmountInput {
  received: number;
  receivedCurrency: string;
  chargedCurrency: string;
  total?: number;
  rate?: number;
  fee?: number;
}

export function withdrawalChargedAmount(
  input: WithdrawalChargedAmountInput,
): number | null {
  const { received, receivedCurrency, chargedCurrency, total, rate, fee } =
    input;
  const feeAmount = fee ?? 0;

  let converted: number;
  if (total !== undefined) {
    converted = roundForCurrency(total - feeAmount, chargedCurrency);
  } else if (rate !== undefined) {
    converted = roundForCurrency(received / rate, chargedCurrency);
  } else if (chargedCurrency === receivedCurrency) {
    converted = received;
  } else {
    return null;
  }

  return converted > 0 ? converted : null;
}

export type WithdrawalChargeResult =
  | { ok: true; converted: number; fee: number | undefined }
  | { ok: false; error: string };

export function resolveWithdrawalCharge(
  input: WithdrawalChargedAmountInput,
): WithdrawalChargeResult {
  const { chargedCurrency, total } = input;
  const fee =
    input.fee === undefined
      ? undefined
      : roundForCurrency(input.fee, chargedCurrency);
  const converted = withdrawalChargedAmount({ ...input, fee });
  if (converted === null) {
    return { ok: false, error: "Charged amount must be greater than the fee" };
  }
  if (fee !== undefined && fee > 0) {
    const withdrawalFeeError = feeAmountError(
      fee,
      chargedCurrency,
      total ?? converted,
    );
    if (withdrawalFeeError) {
      return { ok: false, error: withdrawalFeeError };
    }
  }
  const convertedAmountError = amountValidationError(
    converted,
    chargedCurrency,
  );
  if (convertedAmountError) {
    return { ok: false, error: convertedAmountError };
  }
  return { ok: true, converted, fee };
}
