import { createHash } from "node:crypto";

import { kindOfSource } from "@/lib/constants/sources";
import { snapshotRatesFor } from "@/lib/currency";
import { dedupeTags } from "@/lib/tags";
import type { FxRates, Transaction, TransactionInsert } from "@/types/db";

export function transactionContentHash(row: {
  occurredOn: string;
  amount: number;
  currency: string;
  description: string | null;
  kind: string;
}): string {
  const key = [
    row.occurredOn,
    row.amount.toString(),
    row.currency,
    row.description ?? "",
    row.kind,
  ].join("|");
  return createHash("sha256").update(key).digest("hex");
}

export interface BuildTransactionRowInput {
  userId: string;
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string;
  occurredAt?: string;
  tags?: string[] | null;
  note?: string | null;
  source?: string;
  externalId?: string | null;
}

export interface BuildContext {
  rates: FxRates;
  userCurrencies: string[];
}

export function normalizeTags(tags: string[] | null | undefined): string[] {
  return dedupeTags(tags);
}

export function csvSourcesFrom(
  txs: ReadonlyArray<Pick<Transaction, "source" | "external_id">>,
): string[] {
  const set = new Set<string>();
  for (const tx of txs) {
    if (
      tx.source &&
      tx.external_id &&
      !tx.external_id.startsWith("ss:") &&
      kindOfSource(tx.source) === "csv"
    ) {
      set.add(tx.source);
    }
  }
  return Array.from(set).sort();
}

export function buildTransactionRow(
  input: BuildTransactionRowInput,
  ctx: BuildContext,
): TransactionInsert | null {
  const snapshot = snapshotRatesFor(ctx.rates, [
    input.currency,
    ...ctx.userCurrencies,
  ]);
  if (!snapshot[input.currency]) return null;

  return {
    user_id: input.userId,
    kind: input.kind,
    amount_original: input.amount,
    currency_original: input.currency,
    fx_rates_snapshot: snapshot,
    tags: normalizeTags(input.tags),
    note: input.note?.trim() || null,
    occurred_on: input.occurredOn,
    ...(input.occurredAt && { occurred_at: input.occurredAt }),
    source: input.source ?? "manual",
    external_id: input.externalId ?? null,
  };
}
