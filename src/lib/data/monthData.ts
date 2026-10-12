import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { getLedgerData } from "@/lib/data/ledgerMovements";
import { getUserSettings } from "@/lib/data/userSettings";
import { todayInTz } from "@/lib/dates";
import { resolveTimezone } from "@/lib/preferences.server";
import { requireUser } from "@/lib/session";
import type { Location } from "@/types/db";
import type { LedgerData } from "@/types/ledger";

export interface MonthPageData {
  yearMonth: string;
  ledger: LedgerData;
  places: Location[];
}

export async function getMonthPageData(
  yearMonth: string,
): Promise<MonthPageData> {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const timezone = await resolveTimezone(settings?.timezone);

  const [ledger, places] = await Promise.all([
    getLedgerData(user.id, todayInTz(timezone)),
    db.select().from(locations).where(eq(locations.user_id, user.id)),
  ]);

  return { yearMonth, ledger, places };
}
