import { and, eq, like } from "drizzle-orm";

import { getScaleOf } from "@/lib/data/cryptoAssets";
import { forUser } from "@/lib/db/scope";
import {
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
} from "@/lib/db/schema";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import {
  openingBalancesFrom,
  type OpeningBalances,
} from "@/lib/openingBalance";

export async function getOpeningBalances(
  userId: string,
): Promise<OpeningBalances> {
  const scope = forUser(userId);
  const [rows, scaleOf] = await Promise.all([
    scope
      .select({
        source: ledger_accounts.key,
        currency: ledger_accounts.currency,
        amount: ledger_entries.amount,
        occurredOn: ledger_entries.occurred_on,
      })
      .from(
        ledger_external_ids,
        and(
          like(
            ledger_external_ids.external_id,
            `${EXTERNAL_ID_PREFIX.opening}%`,
          ),
          eq(ledger_accounts.kind, "asset"),
        ),
      )
      .innerJoin(
        ledger_entries,
        and(
          eq(ledger_entries.transaction_id, ledger_external_ids.transaction_id),
          scope.owns(ledger_entries),
        ),
      )
      .innerJoin(
        ledger_accounts,
        and(
          eq(ledger_accounts.id, ledger_entries.account_id),
          scope.owns(ledger_accounts),
        ),
      ),
    getScaleOf(),
  ]);
  return openingBalancesFrom(rows, scaleOf);
}
