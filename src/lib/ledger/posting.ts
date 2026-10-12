import type { AccountRef } from "@/lib/ledger/accounts";
import { LEDGER_ENTRY_ROLES } from "@/lib/db/schema";
import type { LedgerEntryRole } from "@/types/db";

export interface PostingLine {
  account: AccountRef;
  amount: number;
  role: LedgerEntryRole;
  occurredOn: string;
  legacyTxId: string | null;
}

export interface ExternalRef {
  origin: string;
  externalId: string;
}

export interface LedgerDraft {
  occurredOn: string;
  occurredAt: string;
  note: string | null;
  comment: string | null;
  tags: string[];
  recurringId: string | null;
  isFixed: boolean | null;
  budgetMonth: string | null;
  lines: PostingLine[];
  externalRefs: ExternalRef[];
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function postingError(draft: LedgerDraft): string | null {
  if (draft.lines.length < 2) return "A movement needs at least two entries";
  if (!ISO_DAY.test(draft.occurredOn)) return "Invalid date";
  for (const line of draft.lines) {
    if (!Number.isSafeInteger(line.amount) || line.amount === 0) {
      return "Entry amounts must be non-zero whole minor units";
    }
    if (!LEDGER_ENTRY_ROLES.includes(line.role)) return "Invalid entry role";
    if (!ISO_DAY.test(line.occurredOn)) return "Invalid entry date";
  }
  const unbalanced = unbalancedCurrencies(draft.lines);
  if (unbalanced.length > 0) {
    return `Entries do not balance in ${unbalanced.join(", ")}`;
  }
  return null;
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
