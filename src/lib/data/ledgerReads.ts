import { desc } from "drizzle-orm";

import { forUser } from "@/lib/db/scope";
import { ledger_transactions } from "@/lib/db/schema";

export async function hasLedgerTransactions(userId: string): Promise<boolean> {
  const rows = await forUser(userId)
    .select({ id: ledger_transactions.id })
    .from(ledger_transactions)
    .limit(1);
  return rows.length > 0;
}

export async function listTransactionTags(
  userId: string,
): Promise<Array<{ tags: string[] }>> {
  return forUser(userId)
    .select({ tags: ledger_transactions.tags })
    .from(ledger_transactions)
    .orderBy(desc(ledger_transactions.occurred_on));
}
