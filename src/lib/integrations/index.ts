import * as bybit from "./bybit";
import type { IntegrationProvider } from "@/types/db";

export interface NormalizedTx {
  externalId: string;
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string;
  occurredAt: string;
  category: string | null;
  note: string | null;
}

export interface IntegrationCreds {
  apiKey: string;
  apiSecret: string | null;
  extra: Record<string, unknown>;
}

export interface IntegrationAdapter {
  fetchTransactions: (
    creds: IntegrationCreds,
    since: Date,
  ) => Promise<NormalizedTx[]>;
}

export const ADAPTERS: Record<IntegrationProvider, IntegrationAdapter> = {
  bybit,
};

export const SYNCABLE_PROVIDERS: ReadonlySet<IntegrationProvider> = new Set(
  Object.keys(ADAPTERS) as IntegrationProvider[],
);

export function isSyncable(source: string): source is IntegrationProvider {
  return SYNCABLE_PROVIDERS.has(source as IntegrationProvider);
}
