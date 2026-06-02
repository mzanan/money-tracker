import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { recurring_payments, user_settings } from "@/lib/db/schema";
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
    db
      .select({ timezone: user_settings.timezone })
      .from(user_settings)
      .where(eq(user_settings.user_id, user.id))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  return { reminders, today: todayInTz(settings?.timezone ?? "UTC") };
}
