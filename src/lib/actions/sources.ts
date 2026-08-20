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
