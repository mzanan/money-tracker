import { isManualEntryExternalId } from "@/lib/externalIds";
import { amountToInputDigits } from "@/lib/currency";
import { MAX_TAGS_PER_TRANSACTION, tagKey } from "@/lib/tags";
import type { Transaction } from "@/types/db";

export interface EntrySuggestion {
  key: string;
  note: string;
  kind: Transaction["kind"];
  amount: number;
  currency: string;
  tags: string[];
  source: string;
  count: number;
}

function isSuggestible(tx: Transaction): boolean {
  return !tx.transfer_group && isManualEntryExternalId(tx.external_id);
}

export function buildEntrySuggestions(
  txs: ReadonlyArray<Transaction>,
): EntrySuggestion[] {
  const byKey = new Map<string, EntrySuggestion>();
  const lastAt = new Map<string, string>();

  for (const tx of txs) {
    const note = tx.note?.trim();
    if (!note || !isSuggestible(tx)) continue;
    const key = suggestionKey(note);
    const existing = byKey.get(key);
    const seenAt = lastAt.get(key);
    if (existing && seenAt && seenAt >= tx.occurred_at) {
      existing.count += 1;
      continue;
    }
    byKey.set(key, {
      key,
      note,
      kind: tx.kind,
      amount: tx.amount_original,
      currency: tx.currency_original,
      tags: tx.tags.slice(0, MAX_TAGS_PER_TRANSACTION),
      source: tx.source,
      count: (existing?.count ?? 0) + 1,
    });
    lastAt.set(key, tx.occurred_at);
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
    ? amountToInputDigits(suggestion.amount, suggestion.currency)
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
