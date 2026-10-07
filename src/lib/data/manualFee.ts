import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { manualFeeExternalId } from "@/lib/externalIds";
import type { DbTx } from "@/lib/transferUnlink";

export async function repointManualFee(
  userId: string,
  fromId: string,
  toId: string,
  executor: typeof db | DbTx = db,
): Promise<void> {
  await executor
    .update(transactions)
    .set({ external_id: manualFeeExternalId(toId) })
    .where(
      and(
        eq(transactions.user_id, userId),
        eq(transactions.external_id, manualFeeExternalId(fromId)),
      ),
    );
}
