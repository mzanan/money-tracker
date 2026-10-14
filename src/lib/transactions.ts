import { createHash } from "node:crypto";

import {
  kindOfSource,
  labelForSource,
  resolveSourceLabel,
  type AccountLabels,
} from "@/lib/constants/sources";
import { isCsvExternalId } from "@/lib/externalIds";
import { sourcesOf } from "@/lib/ledger/movements";
import { dedupeTags } from "@/lib/tags";
import type { Transaction } from "@/types/db";
import type { Movement } from "@/types/ledger";

export {
  EXTERNAL_ID_PREFIX,
  isCsvExternalId,
  TRANSFER_FEE_DEST_SUFFIX,
} from "@/lib/externalIds";

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

const NOTE_MAX_LENGTH = 280;
const FEE_NOTE_SUFFIX = " fee";

export function manualFeeNote(note: string | null | undefined): string {
  const base = note?.trim().slice(0, NOTE_MAX_LENGTH - FEE_NOTE_SUFFIX.length);
  return base ? `${base}${FEE_NOTE_SUFFIX}` : "Fee";
}
