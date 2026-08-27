import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import type { AccountLabels } from "@/lib/constants/sources";

import type { Account } from "@/types/db";

export type { AccountLabels } from "@/lib/constants/sources";
export { resolveSourceLabel } from "@/lib/constants/sources";

export async function listAccounts(userId: string): Promise<Account[]> {
  return db.select().from(accounts).where(eq(accounts.user_id, userId));
}

export async function listAccountSources(userId: string): Promise<string[]> {
  const rows = await db
    .select({ source: accounts.source })
    .from(accounts)
    .where(eq(accounts.user_id, userId));
  return rows.map((row) => row.source);
}

export async function getAccountBySource(
  userId: string,
  source: string,
): Promise<Account | null> {
  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.user_id, userId), eq(accounts.source, source)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAccountLabels(userId: string): Promise<AccountLabels> {
  const rows = await listAccounts(userId);
  return Object.fromEntries(rows.map((row) => [row.source, row.label]));
}
