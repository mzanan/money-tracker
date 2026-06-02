"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getUser } from "@/lib/session";

import type { ActionResult } from "./transactions";

export async function deleteSource(
  source: string,
): Promise<ActionResult<{ deleted: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const value = source.trim().toLowerCase();
  if (!value) return { ok: false, error: "Account name required" };

  const deleted = await db
    .delete(transactions)
    .where(
      and(eq(transactions.user_id, user.id), eq(transactions.source, value)),
    )
    .returning({ id: transactions.id });

  revalidatePath("/", "layout");
  return { ok: true, data: { deleted: deleted.length } };
}

export async function renameSource(
  from: string,
  to: string,
): Promise<ActionResult<{ updated: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const fromValue = from.trim().toLowerCase();
  const toValue = to.trim().toLowerCase();
  if (!fromValue || !toValue) return { ok: false, error: "Name required" };
  if (toValue === "manual") {
    return { ok: false, error: "'manual' is reserved" };
  }
  if (fromValue === toValue) return { ok: true, data: { updated: 0 } };

  try {
    const updated = await db
      .update(transactions)
      .set({ source: toValue })
      .where(
        and(
          eq(transactions.user_id, user.id),
          eq(transactions.source, fromValue),
        ),
      )
      .returning({ id: transactions.id });

    revalidatePath("/", "layout");
    return { ok: true, data: { updated: updated.length } };
  } catch {
    return {
      ok: false,
      error: "Rename failed — a transaction already exists under that name",
    };
  }
}
