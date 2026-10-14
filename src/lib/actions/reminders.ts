"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { ActionError, actionErrorMessage } from "@/lib/actionError";
import { amountValidationError } from "@/lib/currency";
import { db } from "@/lib/db";
import { recurring_payments, user_settings } from "@/lib/db/schema";
import {
  findCrossSourceCandidates,
  getFlowCandidatesBetween,
} from "@/lib/data/duplicates";
import {
  existingExternalIds,
  getLedgerRecord,
  getScaleOf,
  postLedgerTransaction,
} from "@/lib/data/ledgerWrites";
import { hasReminderRef } from "@/lib/ledger/candidates";
import { reminderExpenseDraft } from "@/lib/ledger/reminderDraft";
import type { FlowCandidate } from "@/types/ledger";
import { resolveTimezone } from "@/lib/preferences.server";
import { getRates } from "@/lib/rates";
import { computeNextDue } from "@/lib/reminders";
import {
  createReminderSchema,
  updateReminderSchema,
  type CreateReminderInput,
  type UpdateReminderInput,
} from "@/lib/schemas/reminder";
import { getUser } from "@/lib/session";
import { isValidCalendarDate, todayInTz } from "@/lib/dates";

import type { ActionResult } from "./transactions";

function normalizeInterval(
  frequency: string,
  intervalMonths?: number | null,
): number | null {
  return frequency === "CUSTOM_MONTHS" ? (intervalMonths ?? 1) : null;
}

function reminderAmountError(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (amount == null || !currency) return null;
  return amountValidationError(amount, currency);
}

export async function createReminder(
  input: CreateReminderInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createReminderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const amountError = reminderAmountError(
    parsed.data.amount,
    parsed.data.currency,
  );
  if (amountError) return { ok: false, error: amountError };

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
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

export async function updateReminder(
  input: UpdateReminderInput,
): Promise<ActionResult> {
  const parsed = updateReminderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const amountError = reminderAmountError(
    parsed.data.amount,
    parsed.data.currency,
  );
  if (amountError) return { ok: false, error: amountError };

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
      error: actionErrorMessage(error, "Update failed"),
    };
  }
}

export interface ReminderPaymentCandidate {
  id: string;
  source: string;
  occurredOn: string;
  amount: number;
  currency: string;
  note: string | null;
}

function toCandidate(candidate: FlowCandidate): ReminderPaymentCandidate {
  return {
    id: candidate.id,
    source: candidate.source,
    occurredOn: candidate.occurredOn,
    amount: candidate.amount,
    currency: candidate.currency,
    note: candidate.note,
  };
}

function isLinkable(candidate: FlowCandidate): boolean {
  return (
    candidate.kind === "expense" &&
    candidate.recurringId == null &&
    !hasReminderRef(candidate)
  );
}

export async function getReminderPayOptions(
  id: string,
  day: string,
): Promise<
  ActionResult<{
    suggested: ReminderPaymentCandidate[];
    recent: ReminderPaymentCandidate[];
  }>
> {
  if (!isValidCalendarDate(day)) return { ok: false, error: "Invalid date" };

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

  const recentRows = (await getFlowCandidatesBetween(user.id, day, day))
    .filter(isLinkable)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  let suggested: ReminderPaymentCandidate[] = [];
  if (reminder.amount != null && reminder.currency) {
    const rates = await getRates()
      .then((r) => r.rates)
      .catch(() => null);
    const [result] = await findCrossSourceCandidates(
      [
        {
          userId: user.id,
          occurredOn: day,
          amount: reminder.amount,
          currency: reminder.currency,
          kind: "expense",
        },
      ],
      rates,
    );
    suggested = result.matches.filter(isLinkable).map(toCandidate);
  }

  const suggestedIds = new Set(suggested.map((s) => s.id));
  const recent = recentRows
    .filter((tx) => !suggestedIds.has(tx.id))
    .map(toCandidate);

  return { ok: true, data: { suggested, recent } };
}

const LINKED_ELSEWHERE_ERROR =
  "This transaction is already linked to another reminder";

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
    .select({ timezone: user_settings.timezone })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  let day = paidOn;
  if (!day || !isValidCalendarDate(day)) {
    day = todayInTz(await resolveTimezone(settings?.timezone));
  }

  try {
    const linkId = options?.linkTransactionId;
    if (linkId) {
      const record = await getLedgerRecord(user.id, linkId);
      if (!record) return { ok: false, error: "Transaction not found" };
      if (
        record.movement.recurringId != null &&
        record.movement.recurringId !== id
      ) {
        return { ok: false, error: LINKED_ELSEWHERE_ERROR };
      }
      day = record.movement.occurredOn;
    }
    const resolvedDay = day;

    const installmentsPaid = reminder.installments_paid + 1;
    const completed =
      reminder.installments_total != null &&
      installmentsPaid >= reminder.installments_total;

    const expenseDraft =
      linkId || options?.skipExpense
        ? null
        : reminderExpenseDraft(reminder, resolvedDay, await getScaleOf());

    let expenseAdded = false;
    await db.transaction(async (dbTx) => {
      if (linkId) {
        const record = await getLedgerRecord(user.id, linkId, dbTx);
        if (!record) throw new ActionError("Transaction not found");
        const { draft } = record;
        if (draft.recurringId != null && draft.recurringId !== id) {
          throw new ActionError(LINKED_ELSEWHERE_ERROR);
        }
        await postLedgerTransaction(
          user.id,
          {
            ...draft,
            comment: draft.comment || reminder.label,
            recurringId: reminder.id,
          },
          { replaceId: linkId, executor: dbTx, expected: draft },
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
      if (expenseDraft) {
        const [ref] = expenseDraft.externalRefs;
        const taken = await existingExternalIds(
          user.id,
          ref.origin,
          [ref.externalId],
          dbTx,
        );
        if (taken.size === 0) {
          await postLedgerTransaction(user.id, expenseDraft, {
            executor: dbTx,
          });
          expenseAdded = true;
        }
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
      error: actionErrorMessage(error, "Update failed"),
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
      error: actionErrorMessage(error, "Delete failed"),
    };
  }
}
