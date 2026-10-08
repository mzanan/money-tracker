import { CRYPTO_CODES } from "@/lib/constants/currencies";
import type { FxRates } from "@/types/db";

export interface SpotTicker {
  symbol: string;
  lastPrice: string;
}

function positivePrice(value: number | undefined): number | null {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export const USDC_USDT_SYMBOL = "USDCUSDT";

export function spotSymbol(code: string): string {
  return `${code}USDT`;
}

export function cryptoSpotSymbols(): string[] {
  return [
    USDC_USDT_SYMBOL,
    ...CRYPTO_CODES.filter((code) => code !== "USDT" && code !== "USDC").map(
      spotSymbol,
    ),
  ];
}

export function cryptoRatesFromTickers(
  tickers: ReadonlyArray<SpotTicker>,
): FxRates {
  const prices = new Map(
    tickers.map((ticker) => [ticker.symbol, Number(ticker.lastPrice)]),
  );
  const usdtPerUsd = positivePrice(prices.get(USDC_USDT_SYMBOL)) ?? 1;
  const rates: FxRates = { USDT: usdtPerUsd, USDC: 1 };
  for (const code of CRYPTO_CODES) {
    if (code in rates) continue;
    const price = positivePrice(prices.get(spotSymbol(code)));
    if (price !== null) rates[code] = usdtPerUsd / price;
  }
  return rates;
}

export function cryptoRatesIn(rates: FxRates | null | undefined): FxRates {
  const picked: FxRates = {};
  if (!rates) return picked;
  for (const code of CRYPTO_CODES) {
    if (rates[code] !== undefined) picked[code] = rates[code];
  }
  return picked;
}

export function hasMissingCryptoRates(rates: FxRates): boolean {
  return CRYPTO_CODES.some((code) => rates[code] === undefined);
}

export function hasNoMarketCryptoRates(rates: FxRates): boolean {
  return CRYPTO_CODES.filter(
    (code) => code !== "USDT" && code !== "USDC",
  ).every((code) => rates[code] === undefined);
}
