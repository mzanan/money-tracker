import { convert } from "@/lib/currency";
import type { DisplayMode } from "@/stores/uiStore";
import type { FxRates, Transaction } from "@/types/db";

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
  mode: DisplayMode,
  todayRates: FxRates | undefined,
): number {
  // "today" mode uses live rates; if they're not loaded yet, fall back to snapshot.
  const rates =
    mode === "today" && todayRates ? todayRates : tx.fx_rates_snapshot;
  return convert(
    tx.amount_original,
    tx.currency_original,
    displayCurrency,
    rates,
  );
}

export function periodTotals(
  txs: Transaction[],
  displayCurrency: string,
  mode: DisplayMode,
  todayRates: FxRates | undefined,
): TotalsBreakdown {
  let income = 0;
  let expense = 0;
  for (const tx of txs) {
    let value: number;
    try {
      value = transactionInDisplay(tx, displayCurrency, mode, todayRates);
    } catch {
      // Skip txs missing a rate so the partial total still renders.
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
  mode: DisplayMode,
  todayRates: FxRates | undefined,
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
    const totals = periodTotals(dayTxs, displayCurrency, mode, todayRates);
    return { date, transactions: dayTxs, ...totals };
  });
}
