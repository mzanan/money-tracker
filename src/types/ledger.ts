import type {
  FxRates,
  LedgerAccountKind,
  LedgerEntryRole,
} from "@/types/db";

export interface MovementLine {
  id: string;
  accountId: string;
  kind: LedgerAccountKind;
  key: string;
  currency: string;
  amount: number;
  role: LedgerEntryRole;
  occurredOn: string;
  legacyTxId: string | null;
}

export interface MovementExternalRef {
  origin: string;
  externalId: string;
}

export interface Movement {
  id: string;
  occurredOn: string;
  occurredAt: string;
  budgetMonth: string | null;
  note: string | null;
  comment: string | null;
  tags: string[];
  recurringId: string | null;
  isFixed: boolean | null;
  externalRefs: MovementExternalRef[];
  lines: MovementLine[];
  leg: MovementLeg | null;
}

export interface MovementLeg {
  movementId: string;
  type: MovementType;
  ends: { from: string; to: string } | null;
  direction: "sent" | "received";
}

export type MovementType =
  | "expense"
  | "income"
  | "transfer"
  | "exchange"
  | "unresolved";

export type RatesByDate = Record<string, FxRates>;

export type FlowKind = "income" | "expense" | "transfer";

export interface MovementAmount {
  kind: FlowKind;
  amount: number;
  currency: string;
  lines: MovementLine[];
}

export interface SimpleFlow {
  kind: "income" | "expense";
  source: string;
  currency: string;
  amount: number;
}

export interface LedgerData {
  movements: Movement[];
  ratesByDate: RatesByDate;
}

export interface RowFacts {
  id: string;
  movementId: string;
  kind: "income" | "expense";
  source: string;
  amount: number;
  currency: string;
  note: string | null;
  tags: string[];
  occurredOn: string;
  budgetMonth: string | null;
  externalId: string | null;
  isTransfer: boolean;
  transferGroup: string | null;
}
