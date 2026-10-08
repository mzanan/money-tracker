import { desc, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { fx_rates_daily } from "@/lib/db/schema";
import { isValidCalendarDate } from "@/lib/dates";
import { INCOMPLETE_DAILY_SOURCES } from "@/lib/fx/historicalRates";
import type { FxRates } from "@/types/db";

export interface FxRatesDailyRow {
  date: string;
  rates: FxRates;
  source: string;
}

export async function writeFxRatesDaily(row: FxRatesDailyRow): Promise<void> {
  const values = {
    rates: row.rates,
    source: row.source,
    fetched_at: new Date().toISOString(),
  };
  await db
    .insert(fx_rates_daily)
    .values({ date: row.date, ...values })
    .onConflictDoUpdate({ target: fx_rates_daily.date, set: values });
}

export async function readFxRatesForDate(
  date: string,
): Promise<FxRatesDailyRow | null> {
  if (!isValidCalendarDate(date)) {
    throw new Error(`Invalid calendar date: ${date}`);
  }
  const row = await db
    .select({
      date: fx_rates_daily.date,
      rates: fx_rates_daily.rates,
      source: fx_rates_daily.source,
    })
    .from(fx_rates_daily)
    .where(lte(fx_rates_daily.date, date))
    .orderBy(desc(fx_rates_daily.date))
    .limit(1)
    .then((rows) => rows[0]);
  return row ?? null;
}

export async function listCompleteFxRatesDates(): Promise<Set<string>> {
  const rows = await db
    .select({ date: fx_rates_daily.date, source: fx_rates_daily.source })
    .from(fx_rates_daily);
  return new Set(
    rows
      .filter((row) => !INCOMPLETE_DAILY_SOURCES.includes(row.source))
      .map((row) => row.date),
  );
}
