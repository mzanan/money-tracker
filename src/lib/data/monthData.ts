import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { locations, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import type { Location, Transaction } from "@/types/db";

export interface MonthPageData {
  yearMonth: string;
  lifetimeTxs: Transaction[];
  places: Location[];
}

export async function getMonthPageData(
  yearMonth: string,
): Promise<MonthPageData> {
  const user = await requireUser();

  const [lifetimeTxs, places] = await Promise.all([
    db.select().from(transactions).where(eq(transactions.user_id, user.id)),
    db.select().from(locations).where(eq(locations.user_id, user.id)),
  ]);

  return { yearMonth, lifetimeTxs, places };
}
