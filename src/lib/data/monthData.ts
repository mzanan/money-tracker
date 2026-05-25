import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions, user_settings } from "@/lib/db/schema";
import {
  monthBounds,
  oldestYearMonthFrom,
  shiftYearMonth,
  thisYearMonth,
} from "@/lib/dates";
import { requireUser } from "@/lib/session";
import type { Transaction, UserSettings } from "@/types/db";

export interface MonthPageData {
  settings: Pick<UserSettings, "timezone"> | null;
  yearMonth: string;
  monthTxs: Transaction[];
  lifetimeTxs: Transaction[];
  oldestYearMonth: string | null;
  hasOlder: boolean;
  hasNewer: boolean;
}

export async function getMonthPageData(
  yearMonth: string,
): Promise<MonthPageData> {
  const user = await requireUser();

  const settings = await db
    .select({ timezone: user_settings.timezone })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  const [start, end] = monthBounds(yearMonth);

  const [monthTxs, lifetimeTxs] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, user.id),
          gte(transactions.occurred_on, start),
          lte(transactions.occurred_on, end),
        ),
      )
      .orderBy(desc(transactions.occurred_on), desc(transactions.occurred_at)),
    db.select().from(transactions).where(eq(transactions.user_id, user.id)),
  ]);

  const currentYearMonth = thisYearMonth(settings?.timezone ?? "UTC");
  const oldestYearMonth = oldestYearMonthFrom(lifetimeTxs);
  const prev = shiftYearMonth(yearMonth, -1);
  const hasOlder = oldestYearMonth !== null && prev >= oldestYearMonth;
  const hasNewer = yearMonth < currentYearMonth;

  return {
    settings: settings ?? null,
    yearMonth,
    monthTxs,
    lifetimeTxs,
    oldestYearMonth,
    hasOlder,
    hasNewer,
  };
}
