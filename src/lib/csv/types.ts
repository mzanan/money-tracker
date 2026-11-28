import type { Money } from "@/types/ledger";

export interface CsvRow {
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string;
  occurredAt?: string;
  description: string | null;
  externalId?: string | null;
  feeAmount?: number;
  spent?: Money;
}
