import { and, eq, inArray } from "drizzle-orm";

import { roundForCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { EXTERNAL_ID_PREFIX, transferFeeExternalId } from "@/lib/externalIds";
import { transferLegsAreNet } from "@/lib/transfer";

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function unlinkTransferGroup(
  dbTx: DbTx,
  userId: string,
  group: string,
): Promise<void> {
  const linked = await dbTx
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, userId),
        eq(transactions.transfer_group, group),
      ),
    );

  const originFeeId = transferFeeExternalId(group);
  const destinationFeeId = transferFeeExternalId(group, "destination");
  const isWithdrawal = linked.some((row) =>
    row.external_id?.startsWith(EXTERNAL_ID_PREFIX.withdrawal),
  );

  const feeRows = isWithdrawal
    ? []
    : await dbTx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            inArray(transactions.external_id, [originFeeId, destinationFeeId]),
          ),
        );

  const kept = linked.filter(
    (row) => !row.external_id?.startsWith(EXTERNAL_ID_PREFIX.transfer),
  );
  const originFeeRow = feeRows.find((row) => row.external_id === originFeeId);
  const legsAreNet = transferLegsAreNet(
    linked,
    originFeeRow?.amount_original ?? 0,
    feeRows.some((row) => row.external_id === destinationFeeId),
  );
  const restored = new Map<string, number>();
  for (const feeRow of legsAreNet ? feeRows : []) {
    const isDestination = feeRow.external_id === destinationFeeId;
    const target = kept.find(
      (row) =>
        row.source === feeRow.source &&
        row.currency_original === feeRow.currency_original &&
        row.kind === (isDestination ? "income" : "expense"),
    );
    if (!target) continue;
    const current = restored.get(target.id) ?? target.amount_original;
    restored.set(
      target.id,
      roundForCurrency(
        isDestination
          ? current - feeRow.amount_original
          : current + feeRow.amount_original,
        target.currency_original,
      ),
    );
  }

  for (const row of linked) {
    if (row.external_id?.startsWith(EXTERNAL_ID_PREFIX.transfer)) {
      await dbTx
        .delete(transactions)
        .where(
          and(eq(transactions.id, row.id), eq(transactions.user_id, userId)),
        );
    } else {
      const amount = restored.get(row.id);
      await dbTx
        .update(transactions)
        .set({
          transfer_group: null,
          ...(amount !== undefined ? { amount_original: amount } : {}),
        })
        .where(
          and(eq(transactions.id, row.id), eq(transactions.user_id, userId)),
        );
    }
  }
  if (!isWithdrawal) {
    await dbTx
      .delete(transactions)
      .where(
        and(
          eq(transactions.user_id, userId),
          inArray(transactions.external_id, [originFeeId, destinationFeeId]),
        ),
      );
  }
}

export async function unlinkWithdrawalGroup(
  dbTx: DbTx,
  userId: string,
  group: string,
): Promise<void> {
  await dbTx
    .delete(transactions)
    .where(
      and(
        eq(transactions.user_id, userId),
        eq(transactions.transfer_group, group),
        eq(
          transactions.external_id,
          `${EXTERNAL_ID_PREFIX.withdrawal}${group}:in`,
        ),
      ),
    );
  await dbTx
    .update(transactions)
    .set({ transfer_group: null })
    .where(
      and(
        eq(transactions.user_id, userId),
        eq(transactions.transfer_group, group),
      ),
    );
  await dbTx
    .update(transactions)
    .set({ external_id: `${EXTERNAL_ID_PREFIX.withdrawal}${group}` })
    .where(
      and(
        eq(transactions.user_id, userId),
        eq(
          transactions.external_id,
          `${EXTERNAL_ID_PREFIX.withdrawal}${group}:out`,
        ),
      ),
    );
}
