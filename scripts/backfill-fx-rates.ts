import { config } from "dotenv";

import { CRYPTO_CODES } from "../src/lib/constants/currencies";
import {
  listCompleteFxRatesDates,
  writeFxRatesDaily,
} from "../src/lib/data/fxRatesDaily";
import {
  addUtcDays,
  datesBetween,
  isValidCalendarDate,
  todayInTz,
} from "../src/lib/dates";
import {
  cryptoSpotSymbols,
  hasNoMarketCryptoRates,
} from "../src/lib/fx/cryptoRates";
import {
  DAILY_RATES_SOURCE,
  historicalRatesForDate,
  klineOpensByDate,
  type BybitKline,
} from "../src/lib/fx/historicalRates";
import { BYBIT_API } from "../src/lib/integrations/bybit";
import { fetchRatesFromProvider } from "../src/lib/rates";

config({ path: ".env.local" });
config();

delete process.env.TURSO_EMBEDDED_REPLICA_PATH;

const FIRST_AVAILABLE_DATE = "2024-03-02";
const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 15_000;

const apply = process.argv.includes("--apply");
const fromArg = process.argv.find((arg) => arg.startsWith("--from="));
const from = fromArg ? fromArg.slice("--from=".length) : FIRST_AVAILABLE_DATE;
const to = addUtcDays(todayInTz("UTC"), -1);

function exchangeApiUrls(date: string): string[] {
  return [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.min.json`,
    `https://${date}.currency-api.pages.dev/v1/currencies/usd.min.json`,
  ];
}

async function fetchExchangeApi(
  date: string,
): Promise<Record<string, unknown> | null> {
  for (const url of exchangeApiUrls(date)) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      const data = (await response.json()) as { usd?: Record<string, unknown> };
      if (data.usd) return data.usd;
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchDailyOpens(
  symbol: string,
  startMs: number,
  endMs: number,
): Promise<Map<string, string>> {
  const opens = new Map<string, string>();
  let end = endMs;
  while (end >= startMs) {
    const url = `${BYBIT_API}/v5/market/kline?category=spot&symbol=${symbol}&interval=D&start=${startMs}&end=${end}&limit=1000`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Bybit ${symbol} responded ${response.status}`);
    }
    const data = (await response.json()) as {
      retCode: number;
      retMsg?: string;
      result?: { list?: BybitKline[] };
    };
    if (data.retCode !== 0) {
      throw new Error(
        `Bybit ${symbol} retCode ${data.retCode}: ${data.retMsg}`,
      );
    }
    const list = data.result?.list ?? [];
    if (list.length === 0) break;
    for (const [date, open] of klineOpensByDate(list)) opens.set(date, open);
    const nextEnd = Math.min(...list.map((kline) => Number(kline[0]))) - 1;
    if (nextEnd >= end) break;
    end = nextEnd;
  }
  return opens;
}

async function main() {
  if (!isValidCalendarDate(from) || from < FIRST_AVAILABLE_DATE) {
    throw new Error(
      `--from must be a YYYY-MM-DD date on or after ${FIRST_AVAILABLE_DATE}`,
    );
  }

  const complete = await listCompleteFxRatesDates();
  const missing = datesBetween(from, to).filter((date) => !complete.has(date));
  console.log(`Range ${from}..${to}: ${missing.length} dates missing.`);
  if (missing.length === 0) return;

  const { rates: live } = await fetchRatesFromProvider();
  const cryptoCodes = new Set(CRYPTO_CODES);
  const fiatCodes = new Set(
    Object.keys(live).filter((code) => !cryptoCodes.has(code)),
  );

  const startMs = Date.parse(`${missing[0]}T00:00:00Z`);
  const endMs = Date.parse(`${missing[missing.length - 1]}T00:00:00Z`);
  const opensBySymbol = new Map<string, Map<string, string>>();
  for (const symbol of cryptoSpotSymbols()) {
    const opens = await fetchDailyOpens(symbol, startMs, endMs);
    opensBySymbol.set(symbol, opens);
    console.log(`Bybit ${symbol}: ${opens.size} daily opens.`);
  }

  let written = 0;
  let sampled = false;
  const skipped: string[] = [];
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (date) => {
        const perUsd = await fetchExchangeApi(date);
        if (!perUsd) {
          skipped.push(date);
          return;
        }
        const rates = historicalRatesForDate(
          perUsd,
          fiatCodes,
          opensBySymbol,
          date,
        );
        if (apply) {
          await writeFxRatesDaily({
            date,
            rates,
            source: hasNoMarketCryptoRates(rates)
              ? DAILY_RATES_SOURCE.backfillFiatOnly
              : DAILY_RATES_SOURCE.backfill,
          });
        } else if (!sampled) {
          sampled = true;
          console.log(
            `Sample ${date}: VND ${rates.VND}, ARS ${rates.ARS}, BTC ${rates.BTC}, USDT ${rates.USDT}`,
          );
        }
        written += 1;
      }),
    );
  }

  console.log(
    `${apply ? "Wrote" : "Would write"} ${written} dates, skipped ${skipped.length}${skipped.length ? `: ${skipped.sort().join(", ")}` : ""}.`,
  );
  if (!apply) console.log("Dry run. Re-run with --apply to write.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
