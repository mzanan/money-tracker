import { asc, eq } from "drizzle-orm";

import { forUser } from "@/lib/db/scope";
import { recurring_payments } from "@/lib/db/schema";
import { getUserSettings } from "@/lib/data/userSettings";
import { userToday } from "@/lib/preferences.server";
import { requireUser } from "@/lib/session";
import type { RecurringPayment } from "@/types/db";

export interface RemindersData {
  reminders: RecurringPayment[];
  completedReminders: RecurringPayment[];
  today: string;
}

export async function getActiveReminders(
  userId: string,
): Promise<RecurringPayment[]> {
  return forUser(userId)
    .selectFrom(recurring_payments, eq(recurring_payments.active, true))
    .orderBy(asc(recurring_payments.next_due_on));
}

export async function getRemindersData(): Promise<RemindersData> {
  const user = await requireUser();

  const [rows, settings] = await Promise.all([
    forUser(user.id)
      .selectFrom(recurring_payments)
      .orderBy(asc(recurring_payments.next_due_on)),
    getUserSettings(user.id),
  ]);

  const reminders = rows.filter((row) => row.active);
  const completedReminders = rows
    .filter((row) => !row.active)
    .sort((a, b) => (b.last_paid_on ?? "").localeCompare(a.last_paid_on ?? ""));

  return {
    reminders,
    completedReminders,
    today: await userToday(settings?.timezone),
  };
}
