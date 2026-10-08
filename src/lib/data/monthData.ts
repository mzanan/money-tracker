import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { getValuedTransactions } from "@/lib/data/valuedTransactions";
import { requireUser } from "@/lib/session";
import type { Location, Transaction } from "@/types/db";

export interface MonthPageData {
  yearMonth: string;
  lifetimeTxs: Transaction[];
  places: Location[];
  costBasisSources: string[];
}

export async function getMonthPageData(
  yearMonth: string,
): Promise<MonthPageData> {
  const user = await requireUser();

  const [valued, places] = await Promise.all([
    getValuedTransactions(user.id),
    db.select().from(locations).where(eq(locations.user_id, user.id)),
  ]);

  return {
    yearMonth,
    lifetimeTxs: valued.transactions,
    places,
    costBasisSources: valued.fundedSources,
  };
}
