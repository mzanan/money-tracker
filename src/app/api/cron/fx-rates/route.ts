import { NextResponse } from "next/server";

import { writeFxRatesDaily } from "@/lib/data/fxRatesDaily";
import { dateInTz, todayInTz } from "@/lib/dates";
import { hasNoMarketCryptoRates } from "@/lib/fx/cryptoRates";
import { DAILY_RATES_SOURCE } from "@/lib/fx/historicalRates";
import { fetchRatesFromProvider } from "@/lib/rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = todayInTz("UTC");
  const { rates, providerUpdatedAt } = await fetchRatesFromProvider();
  if (providerUpdatedAt && dateInTz(providerUpdatedAt, "UTC") !== date) {
    return NextResponse.json({ date, skipped: "provider not updated yet" });
  }

  const source = hasNoMarketCryptoRates(rates)
    ? DAILY_RATES_SOURCE.liveFiatOnly
    : DAILY_RATES_SOURCE.live;
  await writeFxRatesDaily({ date, rates, source });
  return NextResponse.json({
    date,
    source,
    currencies: Object.keys(rates).length,
  });
}
