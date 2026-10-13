import { createHash } from "node:crypto";

import { and, isNotNull, like, notLike, or } from "drizzle-orm";

import {
  kindOfSource,
  labelForSource,
  resolveSourceLabel,
  type AccountLabels,
} from "@/lib/constants/sources";
import { EXTERNAL_ID_PREFIX, isCsvExternalId } from "@/lib/externalIds";
import { snapshotRatesFor } from "@/lib/currency";
import { transactions } from "@/lib/db/schema";
import { sourcesOf } from "@/lib/ledger/movements";
import { dedupeTags } from "@/lib/tags";
import type { FxRates, Transaction, TransactionInsert } from "@/types/db";
import type { Movement } from "@/types/ledger";

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
  tx: Pick<Transaction, "source" | "note" | "tags">,
  accountLabels?: AccountLabels,
): string {
  const sourceLabel = accountLabels
    ? resolveSourceLabel(tx.source, accountLabels)
    : labelForSource(tx.source);
  const detail = tx.note || tx.tags[0] || "";
  return detail ? `${sourceLabel} · ${detail}` : sourceLabel;
}

export function collectSources(
  movements: ReadonlyArray<Movement>,
  extraSources: ReadonlyArray<string>,
): string[] {
  const set = new Set<string>();
  for (const movement of movements) {
    for (const source of sourcesOf(movement)) set.add(source);
  }
  for (const source of extraSources) set.add(source);
  return Array.from(set).sort();
}

export function csvSourcesFrom(movements: ReadonlyArray<Movement>): string[] {
  const set = new Set<string>();
  for (const movement of movements) {
    for (const ref of movement.externalRefs) {
      if (
        isCsvExternalId(ref.externalId) &&
        kindOfSource(ref.origin) === "csv"
      ) {
        set.add(ref.origin);
      }
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

const NOTE_MAX_LENGTH = 280;
const FEE_NOTE_SUFFIX = " fee";

export function manualFeeNote(note: string | null | undefined): string {
  const base = note?.trim().slice(0, NOTE_MAX_LENGTH - FEE_NOTE_SUFFIX.length);
  return base ? `${base}${FEE_NOTE_SUFFIX}` : "Fee";
}
