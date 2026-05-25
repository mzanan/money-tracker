import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { fx_rates_cache } from "@/lib/db/schema";
import type { FxRates } from "@/types/db";

const PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";
// Used when the provider doesn't return `time_next_update_unix`.
const FALLBACK_TTL_MS = 12 * 60 * 60 * 1000;

export class RatesUnavailableError extends Error {
  constructor() {
    super("Exchange rates unavailable right now");
    this.name = "RatesUnavailableError";
  }
}

export interface RatesResult {
  base: "USD";
  rates: FxRates;
  fetchedAt: string;
  /** true when serving expired cache (provider down). */
  stale: boolean;
}

interface ProviderResponse {
  result: string;
  rates: Record<string, number>;
  time_last_update_unix?: number;
  time_next_update_unix?: number;
}

export async function fetchRatesFromProvider(): Promise<{
  rates: FxRates;
  providerUpdatedAt: string | null;
  nextUpdateAt: string | null;
}> {
  const response = await fetch(PROVIDER_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`open.er-api.com responded ${response.status}`);
  }
  const data = (await response.json()) as ProviderResponse;
  if (data.result !== "success" || !data.rates) {
    throw new Error("Invalid response from rates provider");
  }

  const usdt = await fetchUsdtUsdRate();
  const rates: FxRates = { ...data.rates, USDT: usdt };

  return {
    rates,
    providerUpdatedAt: data.time_last_update_unix
      ? new Date(data.time_last_update_unix * 1000).toISOString()
      : null,
    nextUpdateAt: data.time_next_update_unix
      ? new Date(data.time_next_update_unix * 1000).toISOString()
      : null,
  };
}

// Bybit's USDC/USDT spot ticker. USDC is the closest pegged proxy for USD that
// Bybit lists, so lastPrice (USDT per USDC) ≈ USDT per USD.
const BYBIT_TICKER_URL =
  "https://api.bybit.com/v5/market/tickers?category=spot&symbol=USDCUSDT";

interface BybitTickerResponse {
  retCode: number;
  result?: { list?: Array<{ symbol: string; lastPrice: string }> };
}

async function fetchUsdtUsdRate(): Promise<number> {
  try {
    const response = await fetch(BYBIT_TICKER_URL, { cache: "no-store" });
    if (!response.ok) return 1;
    const data = (await response.json()) as BybitTickerResponse;
    const lastPrice = Number(data.result?.list?.[0]?.lastPrice);
    if (!Number.isFinite(lastPrice) || lastPrice <= 0) return 1;
    return lastPrice;
  } catch {
    return 1;
  }
}

export async function getRates(): Promise<RatesResult> {
  const cached = await db
    .select()
    .from(fx_rates_cache)
    .where(eq(fx_rates_cache.base, "USD"))
    .limit(1)
    .then((rows) => rows[0]);

  const now = Date.now();
  const isFresh =
    cached &&
    (cached.next_update_at
      ? new Date(cached.next_update_at).getTime() > now
      : now - new Date(cached.fetched_at).getTime() < FALLBACK_TTL_MS);

  if (cached && isFresh) {
    return {
      base: "USD",
      rates: cached.rates,
      fetchedAt: cached.fetched_at,
      stale: false,
    };
  }

  try {
    const fresh = await fetchRatesFromProvider();
    const fetchedAt = new Date().toISOString();
    await db
      .insert(fx_rates_cache)
      .values({
        base: "USD",
        rates: fresh.rates,
        fetched_at: fetchedAt,
        provider_updated_at: fresh.providerUpdatedAt,
        next_update_at: fresh.nextUpdateAt,
      })
      .onConflictDoUpdate({
        target: fx_rates_cache.base,
        set: {
          rates: fresh.rates,
          fetched_at: fetchedAt,
          provider_updated_at: fresh.providerUpdatedAt,
          next_update_at: fresh.nextUpdateAt,
        },
      });
    return {
      base: "USD",
      rates: fresh.rates,
      fetchedAt,
      stale: false,
    };
  } catch (error) {
    // Provider failed: serve stale cache if we have one; otherwise error out.
    if (cached) {
      console.warn("Rates provider down, serving stale cache", error);
      return {
        base: "USD",
        rates: cached.rates,
        fetchedAt: cached.fetched_at,
        stale: true,
      };
    }
    throw new RatesUnavailableError();
  }
}
