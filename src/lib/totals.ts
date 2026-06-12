import { convert } from "@/lib/currency";
import type { Transaction } from "@/types/db";

export interface TotalsBreakdown {
  income: number;
  expense: number;
  net: number;
}

export interface DayTotals extends TotalsBreakdown {
  date: string;
  transactions: Transaction[];
}

export function transactionInDisplay(
  tx: Transaction,
  displayCurrency: string,
): number {
  return convert(
    tx.amount_original,
    tx.currency_original,
    displayCurrency,
    tx.fx_rates_snapshot,
  );
}

export function periodTotals(
  txs: Transaction[],
  displayCurrency: string,
): TotalsBreakdown {
  let income = 0;
  let expense = 0;
  for (const tx of txs) {
    if (tx.transfer_group) continue;
    let value: number;
    try {
      value = transactionInDisplay(tx, displayCurrency);
    } catch {
      continue;
    }
    if (tx.kind === "income") income += value;
    else expense += value;
  }
  return { income, expense, net: income - expense };
}

export function dayTotalsList(
  txs: Transaction[],
  displayCurrency: string,
): DayTotals[] {
  const byDay = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const list = byDay.get(tx.occurred_on);
    if (list) list.push(tx);
    else byDay.set(tx.occurred_on, [tx]);
  }

  const days = Array.from(byDay.keys()).sort((a, b) => (a > b ? -1 : 1));
  return days.map((date) => {
    const dayTxs = byDay.get(date)!;
    const totals = periodTotals(dayTxs, displayCurrency);
    return { date, transactions: dayTxs, ...totals };
  });
}
