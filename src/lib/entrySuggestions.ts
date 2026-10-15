import {
  isFeeExternalId,
  isManualEntryExternalId,
} from "@/lib/externalIds";
import { toInputDigits } from "@/lib/currency";
import { movementType, principalAssetLines } from "@/lib/ledger/movements";
import { MAX_TAGS_PER_TRANSACTION, tagKey } from "@/lib/tags";
import type { TransactionKind } from "@/types/db";
import type { Movement } from "@/types/ledger";

export interface EntrySuggestion {
  key: string;
  note: string;
  kind: TransactionKind;
  amount: number;
  currency: string;
  tags: string[];
  source: string;
  count: number;
}

function suggestibleFlow(movement: Movement) {
  const kind = movementType(movement);
  if (kind !== "expense" && kind !== "income") return null;
  if (
    !movement.externalRefs.every(
      (ref) =>
        isFeeExternalId(ref.externalId) ||
        isManualEntryExternalId(ref.externalId),
    )
  ) {
    return null;
  }
  const assets = principalAssetLines(movement);
  if (assets.length !== 1) return null;
  return { kind, line: assets[0] };
}

export function buildEntrySuggestions(
  movements: ReadonlyArray<Movement>,
): EntrySuggestion[] {
  const byKey = new Map<string, EntrySuggestion>();
  const lastAt = new Map<string, string>();

  for (const movement of movements) {
    const note = movement.note?.trim();
    if (!note) continue;
    const flow = suggestibleFlow(movement);
    if (!flow) continue;
    const key = suggestionKey(note);
    const existing = byKey.get(key);
    const seenAt = lastAt.get(key);
    if (existing && seenAt && seenAt >= movement.occurredAt) {
      existing.count += 1;
      continue;
    }
    byKey.set(key, {
      key,
      note,
      kind: flow.kind,
      amount: Math.abs(flow.line.amount),
      currency: flow.line.currency,
      tags: movement.tags.slice(0, MAX_TAGS_PER_TRANSACTION),
      source: flow.line.key,
      count: (existing?.count ?? 0) + 1,
    });
    lastAt.set(key, movement.occurredAt);
  }

  return Array.from(byKey.values()).sort(
    (a, b) =>
      b.count - a.count ||
      (lastAt.get(b.key) ?? "").localeCompare(lastAt.get(a.key) ?? ""),
  );
}

function matchRank(key: string, query: string): number {
  if (key === query) return 0;
  if (key.startsWith(query)) return 1;
  if (key.includes(` ${query}`)) return 2;
  if (key.includes(query)) return 3;
  return -1;
}

export function suggestionKey(input: string): string {
  return tagKey(input.replace(/[đĐ]/g, "d"));
}

export function suggestionAmountFill(
  suggestion: Pick<EntrySuggestion, "amount" | "currency">,
  {
    amount,
    filledAmount,
    currencies,
  }: { amount: string; filledAmount: string | null; currencies: string[] },
): { amount: string; currency: string | null } | null {
  if (amount !== "" && amount !== filledAmount) return null;
  const digits = currencies.includes(suggestion.currency)
    ? toInputDigits(suggestion.amount, suggestion.currency)
    : "";
  return { amount: digits, currency: digits ? suggestion.currency : null };
}

export function matchEntrySuggestions(
  suggestions: ReadonlyArray<EntrySuggestion>,
  input: string,
  limit = 4,
): EntrySuggestion[] {
  const query = suggestionKey(input);
  if (!query) return [];

  return suggestions
    .map((suggestion, index) => ({
      suggestion,
      index,
      rank: matchRank(suggestion.key, query),
    }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.suggestion);
}
