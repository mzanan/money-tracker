import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";

export async function hasCredentialAccount(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "credential"),
        isNotNull(account.password),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
