import type { Transaction } from "@/types/db";

export interface CanceledPair {
  expense: Transaction;
  income: Transaction;
}

export function splitCanceledPairs(transactions: Transaction[]): {
  pairs: CanceledPair[];
  rest: Transaction[];
} {
  const pairs: CanceledPair[] = [];
  const used = new Set<string>();

  for (const tx of transactions) {
    if (tx.kind !== "expense" || used.has(tx.id)) continue;
    const refund = transactions.find(
      (other) =>
        other.kind === "income" &&
        !used.has(other.id) &&
        other.source === tx.source &&
        other.currency_original === tx.currency_original &&
        Math.abs(other.amount_original - tx.amount_original) < 0.001,
    );
    if (!refund) continue;
    used.add(tx.id);
    used.add(refund.id);
    pairs.push({ expense: tx, income: refund });
  }

  return { pairs, rest: transactions.filter((tx) => !used.has(tx.id)) };
}

export function excludeCanceledPairs(
  transactions: Transaction[],
): Transaction[] {
  const byDay = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = byDay.get(tx.occurred_on);
    if (list) list.push(tx);
    else byDay.set(tx.occurred_on, [tx]);
  }
  const out: Transaction[] = [];
  for (const list of byDay.values()) {
    out.push(...splitCanceledPairs(list).rest);
  }
  return out;
}
