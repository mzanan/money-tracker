import { and, eq, like } from "drizzle-orm";

import { getScaleOf } from "@/lib/data/cryptoAssets";
import { db } from "@/lib/db";
import {
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
} from "@/lib/db/schema";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { fromMinor } from "@/lib/ledger/amounts";
import type { OpeningBalances } from "@/lib/openingBalance";

export async function getOpeningBalances(
  userId: string,
): Promise<OpeningBalances> {
  const [rows, scaleOf] = await Promise.all([
    db
      .select({
        source: ledger_accounts.key,
        currency: ledger_accounts.currency,
        amount: ledger_entries.amount,
        occurredOn: ledger_entries.occurred_on,
      })
      .from(ledger_external_ids)
      .innerJoin(
        ledger_entries,
        eq(ledger_entries.transaction_id, ledger_external_ids.transaction_id),
      )
      .innerJoin(
        ledger_accounts,
        eq(ledger_accounts.id, ledger_entries.account_id),
      )
      .where(
        and(
          eq(ledger_external_ids.user_id, userId),
          like(
            ledger_external_ids.external_id,
            `${EXTERNAL_ID_PREFIX.opening}%`,
          ),
          eq(ledger_accounts.kind, "asset"),
        ),
      ),
    getScaleOf(),
  ]);
  const openings: OpeningBalances = {};
  for (const row of rows) {
    const bySource = openings[row.source] ?? {};
    bySource[row.currency] = {
      amount: fromMinor(row.amount, scaleOf(row.currency)),
      occurredOn: row.occurredOn,
    };
    openings[row.source] = bySource;
  }
  return openings;
}
