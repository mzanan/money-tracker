import { toInputDigits } from "@/lib/currency";

export interface OpeningBalance {
  amount: number;
  occurredOn: string;
}

export type OpeningBalances = Record<string, Record<string, OpeningBalance>>;

export function openingFields(
  openings: Record<string, OpeningBalance> | undefined,
  currency: string,
): { amount: string; occurredOn: string } {
  const saved = openings?.[currency];
  return saved
    ? {
        amount: toInputDigits(saved.amount, currency),
        occurredOn: saved.occurredOn,
      }
    : { amount: "", occurredOn: "" };
}
