"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { recurring_payments, user_settings } from "@/lib/db/schema";
import { computeNextDue } from "@/lib/reminders";
import {
  createReminderSchema,
  updateReminderSchema,
  type CreateReminderInput,
  type UpdateReminderInput,
} from "@/lib/schemas/reminder";
import { getUser } from "@/lib/session";
import { todayInTz } from "@/lib/dates";

import type { ActionResult } from "./transactions";

function normalizeInterval(
  frequency: string,
  intervalMonths?: number | null,
): number | null {
  return frequency === "CUSTOM_MONTHS" ? (intervalMonths ?? 1) : null;
}

export async function createReminder(
  input: CreateReminderInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createReminderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  try {
    const [inserted] = await db
      .insert(recurring_payments)
      .values({
        user_id: user.id,
        label: d.label,
        amount: d.amount ?? null,
        currency: d.currency?.trim() || null,
        category: d.category?.trim() || null,
        frequency: d.frequency,
        interval_months: normalizeInterval(d.frequency, d.intervalMonths),
        last_paid_on: d.lastPaidOn ?? null,
        next_due_on: d.nextDueOn,
        source: d.source?.trim() || null,
        note: d.note?.trim() || null,
      })
      .returning({ id: recurring_payments.id });
    revalidatePath("/upcoming");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: inserted.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}

export async function updateReminder(
  input: UpdateReminderInput,
): Promise<ActionResult> {
  const parsed = updateReminderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  try {
    await db
      .update(recurring_payments)
      .set({
        label: d.label,
        amount: d.amount ?? null,
        currency: d.currency?.trim() || null,
        category: d.category?.trim() || null,
        frequency: d.frequency,
        interval_months: normalizeInterval(d.frequency, d.intervalMonths),
        last_paid_on: d.lastPaidOn ?? null,
        next_due_on: d.nextDueOn,
        note: d.note?.trim() || null,
      })
      .where(
        and(
          eq(recurring_payments.id, d.id),
          eq(recurring_payments.user_id, user.id),
        ),
      );
    revalidatePath("/upcoming");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

export async function markReminderPaid(
  id: string,
  paidOn?: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const reminder = await db
    .select()
    .from(recurring_payments)
    .where(
      and(
        eq(recurring_payments.id, id),
        eq(recurring_payments.user_id, user.id),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!reminder) return { ok: false, error: "Reminder not found" };

  let day = paidOn;
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const settings = await db
      .select({ timezone: user_settings.timezone })
      .from(user_settings)
      .where(eq(user_settings.user_id, user.id))
      .limit(1)
      .then((rows) => rows[0]);
    day = todayInTz(settings?.timezone ?? "UTC");
  }

  try {
    await db
      .update(recurring_payments)
      .set({
        last_paid_on: day,
        next_due_on: computeNextDue(
          day,
          reminder.frequency,
          reminder.interval_months,
        ),
      })
      .where(
        and(
          eq(recurring_payments.id, id),
          eq(recurring_payments.user_id, user.id),
        ),
      );
    revalidatePath("/upcoming");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await db
      .delete(recurring_payments)
      .where(
        and(
          eq(recurring_payments.id, id),
          eq(recurring_payments.user_id, user.id),
        ),
      );
    revalidatePath("/upcoming");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
