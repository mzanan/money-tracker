import { snapshotRatesFor } from "@/lib/currency";
import type { FxRates, TransactionInsert } from "@/types/db";

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
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
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
