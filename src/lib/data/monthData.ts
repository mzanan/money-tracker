import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions, user_settings } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import type { Transaction, UserSettings } from "@/types/db";

export interface MonthPageData {
  settings: Pick<UserSettings, "timezone"> | null;
  yearMonth: string;
  lifetimeTxs: Transaction[];
}

export async function getMonthPageData(
  yearMonth: string,
): Promise<MonthPageData> {
  const user = await requireUser();

  const [settings, lifetimeTxs] = await Promise.all([
    db
      .select({ timezone: user_settings.timezone })
      .from(user_settings)
      .where(eq(user_settings.user_id, user.id))
      .limit(1)
      .then((rows) => rows[0]),
    db.select().from(transactions).where(eq(transactions.user_id, user.id)),
  ]);

  return {
    settings: settings ?? null,
    yearMonth,
    lifetimeTxs,
  };
}
