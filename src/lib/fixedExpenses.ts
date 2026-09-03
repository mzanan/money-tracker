import { computeNextDue } from "@/lib/reminders";

import type { RecurringPayment, Transaction } from "@/types/db";

export const FIXED_TX_SOURCE = {
  override: "override",
  reminder: "reminder",
  label: "label",
} as const;

export function normalizeFixedLabel(note: string | null | undefined): string {
  if (!note) return "";
  return note.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isFixedTransaction(
  tx: Transaction,
  fixedLabels: string[],
  recurringNotes: Set<string>,
): boolean {
  if (tx.is_fixed === false) return false;
  if (tx.is_fixed === true) return true;
  if (tx.recurring_id != null) return true;
  const normalized = normalizeFixedLabel(tx.note);
  if (normalized === "") return false;
  if (fixedLabels.includes(normalized)) return true;
  return recurringNotes.has(normalized);
}

export function splitFixedVariable(
  txs: Transaction[],
  fixedLabels: string[],
  recurringNotes: Set<string>,
): { fixed: Transaction[]; variable: Transaction[] } {
  const fixed: Transaction[] = [];
  const variable: Transaction[] = [];
  for (const tx of txs) {
    if (isFixedTransaction(tx, fixedLabels, recurringNotes)) fixed.push(tx);
    else variable.push(tx);
  }
  return { fixed, variable };
}

export const REMINDER_AMOUNT_TOLERANCE = 0.1;

export function matchesReminderWithoutLink(
  tx: Transaction,
  reminder: RecurringPayment,
): boolean {
  if (tx.recurring_id != null) return false;
  if (tx.kind !== "expense" || tx.transfer_group) return false;
  const label = normalizeFixedLabel(reminder.label);
  const note = normalizeFixedLabel(tx.note);
  if (label === "" || note === "") return false;
  const exactLabel = note === label;
  if (!exactLabel && !note.includes(label) && !label.includes(note)) {
    return false;
  }
  if (reminder.amount == null) return exactLabel;
  if (reminder.currency != null && tx.currency_original !== reminder.currency) {
    return false;
  }
  return (
    Math.abs(tx.amount_original - reminder.amount) <=
    reminder.amount * REMINDER_AMOUNT_TOLERANCE
  );
}

export function excludePaidReminders(
  reminders: RecurringPayment[],
  monthTransactions: Transaction[],
): RecurringPayment[] {
  return reminders.filter((reminder) => {
    const matchingTxs = monthTransactions.filter(
      (tx) =>
        tx.recurring_id === reminder.id ||
        matchesReminderWithoutLink(tx, reminder),
    );
    if (matchingTxs.length === 0) return true;

    if (reminder.last_paid_on == null) {
      return !matchingTxs.some((tx) => tx.occurred_on >= reminder.next_due_on);
    }

    const expectedNextDue = computeNextDue(
      reminder.last_paid_on,
      reminder.frequency,
      reminder.interval_months,
    );
    const nextDueIsTrustworthy = expectedNextDue === reminder.next_due_on;

    if (nextDueIsTrustworthy) {
      return !matchingTxs.some((tx) => tx.occurred_on >= reminder.next_due_on);
    }
    return !matchingTxs.some(
      (tx) => tx.occurred_on >= (reminder.last_paid_on as string),
    );
  });
}
