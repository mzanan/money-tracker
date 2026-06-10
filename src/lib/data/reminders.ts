import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { recurring_payments } from "@/lib/db/schema";
import { getUserSettings } from "@/lib/data/userSettings";
import { todayInTz } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import type { RecurringPayment } from "@/types/db";

export interface RemindersData {
  reminders: RecurringPayment[];
  today: string;
}

export async function getRemindersData(): Promise<RemindersData> {
  const user = await requireUser();

  const [reminders, settings] = await Promise.all([
    db
      .select()
      .from(recurring_payments)
      .where(
        and(
          eq(recurring_payments.user_id, user.id),
          eq(recurring_payments.active, true),
        ),
      )
      .orderBy(asc(recurring_payments.next_due_on)),
    getUserSettings(user.id),
  ]);

  return { reminders, today: todayInTz(settings?.timezone ?? "UTC") };
}
