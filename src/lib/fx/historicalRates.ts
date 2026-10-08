import { dateInTz } from "@/lib/dates";
import { cryptoRatesFromTickers, type SpotTicker } from "@/lib/fx/cryptoRates";
import type { FxRates } from "@/types/db";

export const DAILY_RATES_SOURCE = {
  live: "open.er-api+bybit",
  liveFiatOnly: "open.er-api",
  backfill: "exchange-api+bybit-backfill",
  backfillFiatOnly: "exchange-api-backfill",
} as const;

export const INCOMPLETE_DAILY_SOURCES: ReadonlyArray<string> = [
  DAILY_RATES_SOURCE.liveFiatOnly,
  DAILY_RATES_SOURCE.backfillFiatOnly,
];

export type BybitKline = [string, string, ...string[]];

export function klineOpensByDate(
  klines: ReadonlyArray<BybitKline>,
): Map<string, string> {
  return new Map(
    klines.map((kline) => [
      dateInTz(new Date(Number(kline[0])).toISOString(), "UTC"),
      kline[1],
    ]),
  );
}

function fiatRatesFromExchangeApi(
  perUsd: Record<string, unknown>,
  keep: ReadonlySet<string>,
): FxRates {
  const rates: FxRates = {};
  for (const [code, value] of Object.entries(perUsd)) {
    const upper = code.toUpperCase();
    if (!keep.has(upper)) continue;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      rates[upper] = value;
    }
  }
  return rates;
}

export function historicalRatesForDate(
  perUsd: Record<string, unknown>,
  fiatCodes: ReadonlySet<string>,
  opensBySymbol: ReadonlyMap<string, ReadonlyMap<string, string>>,
  date: string,
): FxRates {
  const tickers: SpotTicker[] = [];
  for (const [symbol, opens] of opensBySymbol) {
    const lastPrice = opens.get(date);
    if (lastPrice !== undefined) tickers.push({ symbol, lastPrice });
  }
  return {
    ...fiatRatesFromExchangeApi(perUsd, fiatCodes),
    ...cryptoRatesFromTickers(tickers),
    USD: 1,
  };
}
