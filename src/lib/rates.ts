import { readFxRatesCache, writeFxRatesCache } from "@/lib/data/fxRatesCache";
import {
  cryptoRatesFromTickers,
  cryptoRatesIn,
  hasMissingCryptoRates,
  type SpotTicker,
} from "@/lib/fx/cryptoRates";
import type { FxRates } from "@/types/db";

const PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";
// Used when the provider doesn't return `time_next_update_unix`.
const FALLBACK_TTL_MS = 12 * 60 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 5000;

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

export async function fetchRatesFromProvider(previous?: FxRates): Promise<{
  rates: FxRates;
  providerUpdatedAt: string | null;
  nextUpdateAt: string | null;
}> {
  const response = await fetch(PROVIDER_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`open.er-api.com responded ${response.status}`);
  }
  const data = (await response.json()) as ProviderResponse;
  if (data.result !== "success" || !data.rates) {
    throw new Error("Invalid response from rates provider");
  }

  const crypto = await fetchCryptoRates();
  const rates: FxRates = {
    ...data.rates,
    USDT: 1,
    USDC: 1,
    ...cryptoRatesIn(previous),
    ...(crypto ?? {}),
  };

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

const BYBIT_TICKERS_URL =
  "https://api.bybit.com/v5/market/tickers?category=spot";
const CRYPTO_RETRY_MS = 10 * 60 * 1000;

interface BybitTickerResponse {
  retCode: number;
  result?: { list?: SpotTicker[] };
}

async function fetchCryptoRates(): Promise<FxRates | null> {
  try {
    const response = await fetch(BYBIT_TICKERS_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as BybitTickerResponse;
    const list = data.result?.list;
    return list && list.length > 0 ? cryptoRatesFromTickers(list) : null;
  } catch {
    return null;
  }
}

export async function getRates(): Promise<RatesResult> {
  const cached = await readFxRatesCache();

  const now = Date.now();
  const fetchedAgo = cached ? now - new Date(cached.fetchedAt).getTime() : 0;
  const notExpired =
    cached &&
    (cached.nextUpdateAt
      ? new Date(cached.nextUpdateAt).getTime() > now
      : fetchedAgo < FALLBACK_TTL_MS);
  const cryptoRetryDue =
    cached !== null &&
    hasMissingCryptoRates(cached.rates) &&
    fetchedAgo >= CRYPTO_RETRY_MS;

  if (cached && notExpired && !cryptoRetryDue) {
    return {
      base: "USD",
      rates: cached.rates,
      fetchedAt: cached.fetchedAt,
      stale: false,
    };
  }

  try {
    const fresh = await fetchRatesFromProvider(cached?.rates);
    const fetchedAt = new Date().toISOString();
    await writeFxRatesCache({
      rates: fresh.rates,
      fetchedAt,
      providerUpdatedAt: fresh.providerUpdatedAt,
      nextUpdateAt: fresh.nextUpdateAt,
    });
    return {
      base: "USD",
      rates: fresh.rates,
      fetchedAt,
      stale: false,
    };
  } catch (error) {
    if (cached) {
      console.warn("Rates provider down, serving stale cache", error);
      return {
        base: "USD",
        rates: cached.rates,
        fetchedAt: cached.fetchedAt,
        stale: true,
      };
    }
    throw new RatesUnavailableError();
  }
}
