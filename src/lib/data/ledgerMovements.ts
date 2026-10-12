import { eq } from "drizzle-orm";
import { cache } from "react";

import { getUserSettings } from "@/lib/data/userSettings";
import { db } from "@/lib/db";
import {
  crypto_assets,
  fx_rates_daily,
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
  ledger_transactions,
} from "@/lib/db/schema";
import { buildMovements } from "@/lib/ledger/movements";
import { scaleResolver } from "@/lib/ledger/scale";
import {
  ratesByDateFor,
  valuationCurrencies,
  valuationDates,
} from "@/lib/ledger/valuation";
import { DEFAULT_BASE_CURRENCY } from "@/lib/constants/currencies";
import type { LedgerData } from "@/types/ledger";

export const getLedgerData = cache(
  async (userId: string, today: string): Promise<LedgerData> => {
    const [
      txRows,
      entryRows,
      accountRows,
      refRows,
      cryptoRows,
      settings,
      rateRows,
    ] = await Promise.all([
      db
        .select()
        .from(ledger_transactions)
        .where(eq(ledger_transactions.user_id, userId)),
      db
        .select()
        .from(ledger_entries)
        .where(eq(ledger_entries.user_id, userId)),
      db
        .select()
        .from(ledger_accounts)
        .where(eq(ledger_accounts.user_id, userId)),
      db
        .select({
          transaction_id: ledger_external_ids.transaction_id,
          origin: ledger_external_ids.origin,
          external_id: ledger_external_ids.external_id,
        })
        .from(ledger_external_ids)
        .where(eq(ledger_external_ids.user_id, userId)),
      db
        .select({ code: crypto_assets.code, scale: crypto_assets.scale })
        .from(crypto_assets),
      getUserSettings(userId),
      db
        .select({ date: fx_rates_daily.date, rates: fx_rates_daily.rates })
        .from(fx_rates_daily),
    ]);

    const movements = buildMovements(
      {
        transactions: txRows,
        entries: entryRows,
        accounts: accountRows,
        externalIds: refRows,
      },
      scaleResolver(cryptoRows),
    );

    const currencies = valuationCurrencies(
      [DEFAULT_BASE_CURRENCY, settings?.base_currency ?? DEFAULT_BASE_CURRENCY],
      settings?.currencies ?? [],
      accountRows.map((account) => account.currency),
    );

    return {
      movements,
      ratesByDate: ratesByDateFor(
        rateRows,
        valuationDates(movements, today),
        currencies,
      ),
    };
  },
);
