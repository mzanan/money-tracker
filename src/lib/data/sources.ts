import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export interface ImportedSource {
  source: string;
  count: number;
}

export async function getImportedSources(
  userId: string,
): Promise<ImportedSource[]> {
  const rows = await db
    .select({
      source: transactions.source,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(eq(transactions.user_id, userId))
    .groupBy(transactions.source)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r) => ({ source: r.source, count: Number(r.count) }));
}
