"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { recurring_payments, transactions, user_settings } from "@/lib/db/schema";
import { getRates } from "@/lib/rates";
import { computeNextDue } from "@/lib/reminders";
import { buildTransactionRow } from "@/lib/transactions";
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
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

async function insertReminderExpense(
  userId: string,
  reminder: typeof recurring_payments.$inferSelect,
  day: string,
  userCurrencies: string[],
): Promise<boolean> {
  if (reminder.amount == null || !reminder.currency) return false;

  let rates;
  try {
    rates = (await getRates()).rates;
  } catch {
    return false;
  }

  const row = buildTransactionRow(
    {
      userId,
      kind: "expense",
      amount: reminder.amount,
      currency: reminder.currency,
      occurredOn: day,
      tags: reminder.category ? [reminder.category] : [],
      note: reminder.label,
      externalId: `reminder:${reminder.id}:${day}`,
    },
    { rates, userCurrencies },
  );
  if (!row) return false;

  const inserted = await db
    .insert(transactions)
    .values(row)
    .onConflictDoNothing({
      target: [
        transactions.user_id,
        transactions.source,
        transactions.external_id,
      ],
    })
    .returning({ id: transactions.id });
  return inserted.length > 0;
}

export interface ReminderPaymentCandidate {
  id: string;
  source: string;
  occurredOn: string;
  amount: number;
  currency: string;
  note: string | null;
}

export async function previewReminderPaymentCandidates(
  id: string,
): Promise<ActionResult<{ matches: ReminderPaymentCandidate[] }>> {
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
  if (reminder.amount == null || !reminder.currency) {
    return { ok: true, data: { matches: [] } };
  }

  const settings = await db
    .select({ timezone: user_settings.timezone })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);
  const today = todayInTz(settings?.timezone ?? "UTC");

  const rates = await getRates()
    .then((r) => r.rates)
    .catch(() => null);
  const { findCrossSourceCandidates } = await import("@/lib/data/duplicates");
  const [result] = await findCrossSourceCandidates(
    [
      {
        userId: user.id,
        occurredOn: today,
        amount: reminder.amount,
        currency: reminder.currency,
        kind: "expense",
      },
    ],
    rates,
  );

  return {
    ok: true,
    data: {
      matches: result.matches
        .filter((m) => m.source !== "manual")
        .map((m) => ({
          id: m.id,
          source: m.source,
          occurredOn: m.occurred_on,
          amount: m.amount_original,
          currency: m.currency_original,
          note: m.note,
        })),
    },
  };
}

export async function markReminderPaid(
  id: string,
  paidOn?: string,
  options?: { linkTransactionId?: string },
): Promise<ActionResult<{ expenseAdded: boolean; linked: boolean }>> {
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

  const settings = await db
    .select({
      timezone: user_settings.timezone,
      currencies: user_settings.currencies,
    })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  let day = paidOn;
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    day = todayInTz(settings?.timezone ?? "UTC");
  }

  try {
    const linkId = options?.linkTransactionId;
    if (linkId) {
      const tx = await db
        .select()
        .from(transactions)
        .where(
          and(eq(transactions.id, linkId), eq(transactions.user_id, user.id)),
        )
        .limit(1)
        .then((rows) => rows[0]);
      if (!tx) return { ok: false, error: "Transaction not found" };

      const patch: Partial<typeof tx> = {};
      if (!tx.comment) patch.comment = reminder.label;
      if (
        reminder.category &&
        !tx.tags.some(
          (tag) => tag.toLowerCase() === reminder.category?.toLowerCase(),
        )
      ) {
        patch.tags = [...tx.tags, reminder.category];
      }
      if (Object.keys(patch).length > 0) {
        await db
          .update(transactions)
          .set(patch)
          .where(eq(transactions.id, linkId));
      }
      day = tx.occurred_on;
    }

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
    const expenseAdded = linkId
      ? false
      : await insertReminderExpense(
          user.id,
          reminder,
          day,
          settings?.currencies ?? [],
        );
    revalidatePath("/", "layout");
    return { ok: true, data: { expenseAdded, linked: Boolean(linkId) } };
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
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
