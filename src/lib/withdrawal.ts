import { roundForCurrency } from "@/lib/currency";

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
