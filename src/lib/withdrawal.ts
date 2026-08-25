import {
  amountValidationError,
  feeAmountError,
  roundForCurrency,
} from "@/lib/currency";

export const RATE_DECIMALS = 4;

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
