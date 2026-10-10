import {
  resolveSourceLabel,
  type AccountLabels,
} from "@/lib/constants/sources";
import type { LedgerAccountKind, TransactionKind } from "@/types/db";

export const LEDGER_KEYS = {
  uncategorized: "uncategorized",
  fees: "fees",
  fx: "fx",
  pendingOrigin: "pending-origin",
} as const;

export interface AccountRef {
  kind: LedgerAccountKind;
  key: string;
  currency: string;
}

export function accountRefId(ref: AccountRef): string {
  return `${ref.kind}|${ref.key}|${ref.currency}`;
}

export function assetRef(source: string, currency: string): AccountRef {
  return { kind: "asset", key: source, currency };
}

export function uncategorizedRef(
  kind: TransactionKind,
  currency: string,
): AccountRef {
  return { kind, key: LEDGER_KEYS.uncategorized, currency };
}

export function feesRef(currency: string): AccountRef {
  return { kind: "expense", key: LEDGER_KEYS.fees, currency };
}

export function bridgeRef(currency: string): AccountRef {
  return { kind: "bridge", key: LEDGER_KEYS.fx, currency };
}

export function pendingRef(currency: string): AccountRef {
  return { kind: "pending", key: LEDGER_KEYS.pendingOrigin, currency };
}

const SYSTEM_ACCOUNT_NAMES: Record<string, string> = {
  [`expense|${LEDGER_KEYS.uncategorized}`]: "Uncategorized",
  [`income|${LEDGER_KEYS.uncategorized}`]: "Uncategorized income",
  [`expense|${LEDGER_KEYS.fees}`]: "Fees",
  [`bridge|${LEDGER_KEYS.fx}`]: "Currency exchange",
  [`pending|${LEDGER_KEYS.pendingOrigin}`]: "Pending origin",
};

export function accountInstitution(ref: AccountRef): string | null {
  return ref.kind === "asset" ? ref.key : null;
}

export function accountName(ref: AccountRef, labels: AccountLabels): string {
  if (ref.kind === "asset") return resolveSourceLabel(ref.key, labels);
  return SYSTEM_ACCOUNT_NAMES[`${ref.kind}|${ref.key}`] ?? ref.key;
}
