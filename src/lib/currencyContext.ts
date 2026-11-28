import { forUser } from "@/lib/db/scope";
import { user_settings } from "@/lib/db/schema";
import { getRates, RatesUnavailableError } from "@/lib/rates";

export async function buildCurrencyContext(userId: string) {
  const settings = await forUser(userId)
    .select({ currencies: user_settings.currencies })
    .from(user_settings)
    .limit(1)
    .then((rows) => rows[0]);
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
