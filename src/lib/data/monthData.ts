import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import type { Transaction } from "@/types/db";

export interface MonthPageData {
  yearMonth: string;
  lifetimeTxs: Transaction[];
}

export async function getMonthPageData(
  yearMonth: string,
): Promise<MonthPageData> {
  const user = await requireUser();

  const lifetimeTxs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.user_id, user.id));

  return { yearMonth, lifetimeTxs };
}
