import { getUserCurrencies } from "@/lib/data/userSettings";
import { getRates, RatesUnavailableError } from "@/lib/rates";

export async function buildCurrencyContext(userId: string) {
  const settings = await getUserCurrencies(userId);
  if (!settings) return null;
  const rates = (await getRates()).rates;
  return { rates, userCurrencies: settings.currencies };
}

export async function withRatesErrorHandling<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return { ok: false, error: "Exchange rates unavailable. Try again." };
    }
    return { ok: false, error: "Error fetching rates" };
  }
}
