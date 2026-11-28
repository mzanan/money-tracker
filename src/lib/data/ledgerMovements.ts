import { cache } from "react";

import { parseAccountCurrencies } from "@/lib/accountCurrencies";
import { getUserSettings } from "@/lib/data/userSettings";
import { forUser, shared } from "@/lib/db/scope";
import {
  accounts,
  fx_rates_daily,
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
  ledger_transactions,
} from "@/lib/db/schema";
import { buildMovements } from "@/lib/ledger/movements";
import { getScaleOf } from "@/lib/data/cryptoAssets";
import {
  ratesByDateFor,
  valuationCurrencies,
  valuationDates,
} from "@/lib/ledger/valuation";
import { DEFAULT_BASE_CURRENCY } from "@/lib/constants/currencies";
import type { LedgerData } from "@/types/ledger";

export const getLedgerData = cache(
  async (userId: string, today: string): Promise<LedgerData> => {
    const scope = forUser(userId);
    const [
      txRows,
      entryRows,
      accountRows,
      refRows,
      scaleOf,
      settings,
      rateRows,
      declaredRows,
    ] = await Promise.all([
      scope.selectFrom(ledger_transactions),
      scope.selectFrom(ledger_entries),
      scope.selectFrom(ledger_accounts),
      scope
        .select({
          transaction_id: ledger_external_ids.transaction_id,
          origin: ledger_external_ids.origin,
          external_id: ledger_external_ids.external_id,
        })
        .from(ledger_external_ids),
      getScaleOf(),
      getUserSettings(userId),
      shared()
        .select({ date: fx_rates_daily.date, rates: fx_rates_daily.rates })
        .from(fx_rates_daily),
      scope.select({ currency: accounts.currency }).from(accounts),
    ]);

    const movements = buildMovements(
      {
        transactions: txRows,
        entries: entryRows,
        accounts: accountRows,
        externalIds: refRows,
      },
      scaleOf,
    );

    const currencies = valuationCurrencies(
      [DEFAULT_BASE_CURRENCY, settings?.base_currency ?? DEFAULT_BASE_CURRENCY],
      settings?.currencies ?? [],
      accountRows.map((account) => account.currency),
      declaredRows.flatMap((row) => parseAccountCurrencies(row.currency)),
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
