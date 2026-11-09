import { kindOfSource } from "@/lib/constants/sources";
import { toInputDigits } from "@/lib/currency";
import { fromMinor } from "@/lib/ledger/amounts";
import type { ScaleOf } from "@/lib/ledger/scale";

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

export function canTakeOpening(source: string): boolean {
  return kindOfSource(source) !== "api";
}

export interface OpeningBalanceRow {
  source: string;
  currency: string;
  amount: number;
  occurredOn: string;
}

export function openingBalancesFrom(
  rows: ReadonlyArray<OpeningBalanceRow>,
  scaleOf: ScaleOf,
): OpeningBalances {
  const openings: OpeningBalances = {};
  for (const row of rows) {
    const bySource = openings[row.source] ?? {};
    bySource[row.currency] = {
      amount: fromMinor(row.amount, scaleOf(row.currency)),
      occurredOn: row.occurredOn,
    };
    openings[row.source] = bySource;
  }
  return openings;
}
