"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { actionErrorMessage } from "@/lib/actionError";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { isWithdrawalExternalId } from "@/lib/externalIds";
import { getUser } from "@/lib/session";
import {
  unlinkTransferGroup,
  unlinkWithdrawalGroup,
} from "@/lib/transferUnlink";

import type { ActionResult } from "./transactions";

export async function deleteSource(
  source: string,
): Promise<ActionResult<{ deleted: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (typeof source !== "string") {
    return { ok: false, error: "Account name required" };
  }
  const value = source.trim().toLowerCase();
  if (!value) return { ok: false, error: "Account name required" };

  try {
    const deleted = await db.transaction(async (dbTx) => {
      const linkedRows = await dbTx
        .select({
          transfer_group: transactions.transfer_group,
          external_id: transactions.external_id,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, user.id),
            eq(transactions.source, value),
            isNotNull(transactions.transfer_group),
          ),
        );

      const groups = new Map<string, boolean>();
      for (const row of linkedRows) {
        const group = row.transfer_group;
        if (!group) continue;
        groups.set(
          group,
          (groups.get(group) ?? false) ||
            isWithdrawalExternalId(row.external_id),
        );
      }
      for (const [group, isWithdrawal] of groups) {
        if (isWithdrawal) {
          await unlinkWithdrawalGroup(dbTx, user.id, group);
        } else {
          await unlinkTransferGroup(dbTx, user.id, group);
        }
      }

      return dbTx
        .delete(transactions)
        .where(
          and(
            eq(transactions.user_id, user.id),
            eq(transactions.source, value),
          ),
        )
        .returning({ id: transactions.id });
    });

    revalidatePath("/", "layout");
    return { ok: true, data: { deleted: deleted.length } };
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error, "Delete failed") };
  }
}
