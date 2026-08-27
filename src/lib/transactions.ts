import { createHash } from "node:crypto";

import { and, isNotNull, like, notLike, or } from "drizzle-orm";

import {
  kindOfSource,
  labelForSource,
  resolveSourceLabel,
  type AccountLabels,
} from "@/lib/constants/sources";
import { EXTERNAL_ID_PREFIX, isCsvExternalId } from "@/lib/externalIds";
import type { TransferFeeSpec } from "@/lib/transfer";
import { snapshotRatesFor } from "@/lib/currency";
import { transactions } from "@/lib/db/schema";
import { dedupeTags } from "@/lib/tags";
import type { FxRates, Transaction, TransactionInsert } from "@/types/db";

export {
  EXTERNAL_ID_PREFIX,
  isCsvExternalId,
  TRANSFER_FEE_DEST_SUFFIX,
} from "@/lib/externalIds";

export function csvExternalIdCondition() {
  return and(
    isNotNull(transactions.external_id),
    or(
      like(transactions.external_id, `${EXTERNAL_ID_PREFIX.csv}%`),
      notLike(transactions.external_id, "%:%"),
      like(transactions.external_id, "%:fee"),
    ),
  );
}

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
  recurringId?: string | null;
}

export interface BuildContext {
  rates: FxRates;
  userCurrencies: string[];
}

export function normalizeTags(tags: string[] | null | undefined): string[] {
  return dedupeTags(tags);
}

export function transactionLabel(
  tx: Transaction,
  accountLabels?: AccountLabels,
): string {
  const sourceLabel = accountLabels
    ? resolveSourceLabel(tx.source, accountLabels)
    : labelForSource(tx.source);
  const detail = tx.note || tx.tags[0] || "";
  return detail ? `${sourceLabel} · ${detail}` : sourceLabel;
}

export function collectSources(
  txs: ReadonlyArray<Pick<Transaction, "source">>,
  extraSources: ReadonlyArray<string>,
): string[] {
  const set = new Set<string>();
  for (const tx of txs) {
    if (tx.source) set.add(tx.source);
  }
  for (const source of extraSources) set.add(source);
  return Array.from(set).sort();
}

export function csvSourcesFrom(
  txs: ReadonlyArray<Pick<Transaction, "source" | "external_id">>,
): string[] {
  const set = new Set<string>();
  for (const tx of txs) {
    if (
      tx.source &&
      isCsvExternalId(tx.external_id) &&
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
    recurring_id: input.recurringId ?? null,
  };
}

export function buildFeeRow(
  input: Omit<BuildTransactionRowInput, "kind" | "tags">,
  ctx: BuildContext,
): TransactionInsert | null {
  return buildTransactionRow({ ...input, kind: "expense" }, ctx);
}

export function buildTransferFeeRows({
  userId,
  occurredOn,
  ctx,
  specs,
}: {
  userId: string;
  occurredOn: string;
  ctx: BuildContext;
  specs: ReadonlyArray<TransferFeeSpec>;
}): { ok: true; data: TransactionInsert[] } | { ok: false; error: string } {
  const rows: TransactionInsert[] = [];
  for (const spec of specs) {
    const row = buildFeeRow(
      {
        userId,
        amount: spec.amount,
        currency: spec.currency,
        occurredOn,
        note: "Transfer fee",
        source: spec.source,
        externalId: spec.externalId,
      },
      ctx,
    );
    if (!row) return { ok: false, error: `No rate for ${spec.currency}` };
    rows.push(row);
  }
  return { ok: true, data: rows };
}
