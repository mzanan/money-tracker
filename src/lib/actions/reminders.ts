"use server";

import { and, desc, eq, isNull, notLike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { recurring_payments, transactions, user_settings } from "@/lib/db/schema";
import { getRates } from "@/lib/rates";
import { computeNextDue } from "@/lib/reminders";
import { buildTransactionRow, EXTERNAL_ID_PREFIX } from "@/lib/transactions";
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
        frequency: d.frequency,
        interval_months: normalizeInterval(d.frequency, d.intervalMonths),
        installments_total: d.installmentsTotal ?? null,
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
        frequency: d.frequency,
        interval_months: normalizeInterval(d.frequency, d.intervalMonths),
        installments_total: d.installmentsTotal ?? null,
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

async function buildReminderExpenseRow(
  userId: string,
  reminder: typeof recurring_payments.$inferSelect,
  day: string,
  userCurrencies: string[],
) {
  if (reminder.amount == null || !reminder.currency) return null;

  let rates;
  try {
    rates = (await getRates()).rates;
  } catch {
    return null;
  }

  return buildTransactionRow(
    {
      userId,
      kind: "expense",
      amount: reminder.amount,
      currency: reminder.currency,
      occurredOn: day,
      note: reminder.label,
      externalId: `${EXTERNAL_ID_PREFIX.reminder}${reminder.id}:${day}`,
    },
    { rates, userCurrencies },
  );
}

export interface ReminderPaymentCandidate {
  id: string;
  source: string;
  occurredOn: string;
  amount: number;
  currency: string;
  note: string | null;
}

function toCandidate(
  tx: typeof transactions.$inferSelect,
): ReminderPaymentCandidate {
  return {
    id: tx.id,
    source: tx.source,
    occurredOn: tx.occurred_on,
    amount: tx.amount_original,
    currency: tx.currency_original,
    note: tx.note,
  };
}

export async function getReminderPayOptions(id: string): Promise<
  ActionResult<{
    suggested: ReminderPaymentCandidate[];
    recent: ReminderPaymentCandidate[];
  }>
> {
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
    .select({ timezone: user_settings.timezone })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);
  const today = todayInTz(settings?.timezone ?? "UTC");

  const recentRows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, user.id),
        eq(transactions.kind, "expense"),
        or(
          isNull(transactions.external_id),
          notLike(transactions.external_id, `${EXTERNAL_ID_PREFIX.reminder}%`),
        ),
      ),
    )
    .orderBy(desc(transactions.occurred_on), desc(transactions.occurred_at))
    .limit(25);

  let suggested: ReminderPaymentCandidate[] = [];
  if (reminder.amount != null && reminder.currency) {
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
    suggested = result.matches
      .filter((m) => !m.external_id?.startsWith(EXTERNAL_ID_PREFIX.reminder))
      .map(toCandidate);
  }

  const suggestedIds = new Set(suggested.map((s) => s.id));
  const recent = recentRows
    .filter((tx) => !suggestedIds.has(tx.id))
    .slice(0, 12)
    .map(toCandidate);

  return { ok: true, data: { suggested, recent } };
}

export async function markReminderPaid(
  id: string,
  paidOn?: string,
  options?: { linkTransactionId?: string; skipExpense?: boolean },
): Promise<
  ActionResult<{ expenseAdded: boolean; linked: boolean; completed: boolean }>
> {
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
    let linkUpdate: {
      id: string;
      patch: Partial<typeof transactions.$inferSelect>;
    } | null = null;
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
      if (Object.keys(patch).length > 0) linkUpdate = { id: linkId, patch };
      day = tx.occurred_on;
    }
    const resolvedDay = day;

    const installmentsPaid = reminder.installments_paid + 1;
    const completed =
      reminder.installments_total != null &&
      installmentsPaid >= reminder.installments_total;

    // getRates() runs network I/O, so build the expense row before opening the
    // transaction — keep only DB writes inside it.
    const expenseRow =
      linkId || options?.skipExpense
        ? null
        : await buildReminderExpenseRow(
            user.id,
            reminder,
            resolvedDay,
            settings?.currencies ?? [],
          );

    let expenseAdded = false;
    await db.transaction(async (dbTx) => {
      if (linkUpdate) {
        await dbTx
          .update(transactions)
          .set(linkUpdate.patch)
          .where(
            and(
              eq(transactions.id, linkUpdate.id),
              eq(transactions.user_id, user.id),
            ),
          );
      }
      await dbTx
        .update(recurring_payments)
        .set({
          last_paid_on: resolvedDay,
          next_due_on: computeNextDue(
            resolvedDay,
            reminder.frequency,
            reminder.interval_months,
          ),
          installments_paid: installmentsPaid,
          active: completed ? false : reminder.active,
        })
        .where(
          and(
            eq(recurring_payments.id, id),
            eq(recurring_payments.user_id, user.id),
          ),
        );
      if (expenseRow) {
        const inserted = await dbTx
          .insert(transactions)
          .values(expenseRow)
          .onConflictDoNothing({
            target: [
              transactions.user_id,
              transactions.source,
              transactions.external_id,
            ],
          })
          .returning({ id: transactions.id });
        expenseAdded = inserted.length > 0;
      }
    });
    revalidatePath("/", "layout");
    return {
      ok: true,
      data: { expenseAdded, linked: Boolean(linkId), completed },
    };
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
