"use server";

import { revalidatePath } from "next/cache";

import { actionErrorMessage } from "@/lib/actionError";
import { db } from "@/lib/db";
import {
  deleteLedgerTransactions,
  getLedgerRecords,
  postLedgerTransaction,
} from "@/lib/data/ledgerWrites";
import { getSourceTransactionIds } from "@/lib/data/sources";
import { draftsWithoutSource } from "@/lib/ledger/sourceRemoval";
import { getUser } from "@/lib/session";

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
      const ids = await getSourceTransactionIds(user.id, value, dbTx);
      const records = await getLedgerRecords(user.id, ids, dbTx);
      const removed: string[] = [];
      for (const record of records.values()) {
        const [first, ...rest] = draftsWithoutSource(record, value);
        if (!first) {
          removed.push(record.movement.id);
          continue;
        }
        await postLedgerTransaction(user.id, first, {
          replaceId: record.movement.id,
          executor: dbTx,
        });
        for (const draft of rest) {
          await postLedgerTransaction(user.id, draft, { executor: dbTx });
        }
      }
      await deleteLedgerTransactions(user.id, removed, dbTx);
      return records.size;
    });

    revalidatePath("/", "layout");
    return { ok: true, data: { deleted } };
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error, "Delete failed") };
  }
}
