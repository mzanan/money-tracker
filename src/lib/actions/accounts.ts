"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { kindOfSource, normalizeSource } from "@/lib/constants/sources";
import { getUser } from "@/lib/session";

import type { ActionResult } from "./transactions";

function guardEditable(source: string): string | null {
  const kind = kindOfSource(source);
  if (kind === "manual" || kind === "api") {
    return "This account can't be renamed or removed";
  }
  return null;
}

export async function upsertAccountLabel(
  source: string,
  label: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const normalizedSource = normalizeSource(source);
  if (!normalizedSource) return { ok: false, error: "Invalid account" };

  const guardError = guardEditable(normalizedSource);
  if (guardError) return { ok: false, error: guardError };

  const trimmedLabel = label.trim();
  if (!trimmedLabel) return { ok: false, error: "Name is required" };

  const [row] = await db
    .insert(accounts)
    .values({ user_id: user.id, source: normalizedSource, label: trimmedLabel })
    .onConflictDoUpdate({
      target: [accounts.user_id, accounts.source],
      set: { label: trimmedLabel },
    })
    .returning({ id: accounts.id });

  revalidatePath("/", "layout");
  return { ok: true, data: { id: row.id } };
}

export async function removeAccount(
  source: string,
): Promise<ActionResult<{ removed: boolean }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const guardError = guardEditable(source);
  if (guardError) return { ok: false, error: guardError };

  const deleted = await db
    .delete(accounts)
    .where(and(eq(accounts.user_id, user.id), eq(accounts.source, source)))
    .returning({ id: accounts.id });

  revalidatePath("/", "layout");
  return { ok: true, data: { removed: deleted.length > 0 } };
}
