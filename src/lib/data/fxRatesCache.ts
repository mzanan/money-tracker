import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { fx_rates_cache } from "@/lib/db/schema";
import type { FxRates } from "@/types/db";

export interface FxRatesCacheRow {
  rates: FxRates;
  fetchedAt: string;
  providerUpdatedAt: string | null;
  nextUpdateAt: string | null;
}

export async function readFxRatesCache(): Promise<FxRatesCacheRow | null> {
  const row = await db
    .select()
    .from(fx_rates_cache)
    .where(eq(fx_rates_cache.base, "USD"))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) return null;
  return {
    rates: row.rates,
    fetchedAt: row.fetched_at,
    providerUpdatedAt: row.provider_updated_at,
    nextUpdateAt: row.next_update_at,
  };
}

export async function writeFxRatesCache(entry: FxRatesCacheRow): Promise<void> {
  const values = {
    rates: entry.rates,
    fetched_at: entry.fetchedAt,
    provider_updated_at: entry.providerUpdatedAt,
    next_update_at: entry.nextUpdateAt,
  };
  await db
    .insert(fx_rates_cache)
    .values({ base: "USD", ...values })
    .onConflictDoUpdate({ target: fx_rates_cache.base, set: values });
}
