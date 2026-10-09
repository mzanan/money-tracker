import type { AccountRef } from "@/lib/ledger/accounts";

export interface PostingLine {
  account: AccountRef;
  amount: number;
  occurredOn: string;
  legacyTxId: string | null;
}

export function unbalancedCurrencies(
  lines: ReadonlyArray<PostingLine>,
): string[] {
  const sums = new Map<string, number>();
  for (const line of lines) {
    const currency = line.account.currency;
    sums.set(currency, (sums.get(currency) ?? 0) + line.amount);
  }
  return [...sums].filter(([, sum]) => sum !== 0).map(([currency]) => currency);
}
