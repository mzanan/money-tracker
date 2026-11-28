import { asc, eq } from "drizzle-orm";

import { forUser, type UserScope } from "@/lib/db/scope";
import { recurring_payments } from "@/lib/db/schema";
import { getUserSettings } from "@/lib/data/userSettings";
import { userToday } from "@/lib/preferences.server";
import { requireUser } from "@/lib/session";
import type { RecurringPayment, RecurringPaymentInsert } from "@/types/db";

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

export async function getReminder(
  userId: string,
  id: string,
): Promise<RecurringPayment | undefined> {
  return forUser(userId)
    .selectFrom(recurring_payments, eq(recurring_payments.id, id))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function insertReminder(
  userId: string,
  values: Omit<RecurringPaymentInsert, "user_id">,
): Promise<string> {
  const [inserted] = await forUser(userId)
    .insert(recurring_payments, values)
    .returning({ id: recurring_payments.id });
  return inserted.id;
}

export async function updateReminderById(
  scope: UserScope,
  id: string,
  values: Partial<Omit<RecurringPaymentInsert, "user_id">>,
): Promise<void> {
  await scope.update(recurring_payments, values, eq(recurring_payments.id, id));
}

export async function deleteReminderById(
  userId: string,
  id: string,
): Promise<void> {
  await forUser(userId).delete(
    recurring_payments,
    eq(recurring_payments.id, id),
  );
}
