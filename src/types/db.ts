import type {
  api_integrations,
  fx_rates_cache,
  transactions,
  user_settings,
} from "@/lib/db/schema";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** USD-based exchange rates map, e.g. { USD: 1, VND: 25400, EUR: 0.92 }. */
export type FxRates = Record<string, number>;

export type TransactionKind = "income" | "expense";

export type Transaction = typeof transactions.$inferSelect;
export type TransactionInsert = typeof transactions.$inferInsert;
export type TransactionUpdate = Partial<TransactionInsert>;

export type UserSettings = typeof user_settings.$inferSelect;
export type UserSettingsInsert = typeof user_settings.$inferInsert;
export type UserSettingsUpdate = Partial<UserSettingsInsert>;

export type FxRatesCache = typeof fx_rates_cache.$inferSelect;

export type ApiIntegration = typeof api_integrations.$inferSelect;
export type ApiIntegrationInsert = typeof api_integrations.$inferInsert;
export type ApiIntegrationUpdate = Partial<ApiIntegrationInsert>;
export type IntegrationProvider = ApiIntegration["provider"];
