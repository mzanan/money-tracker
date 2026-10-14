import { simpleFlow, spentFlow } from "@/lib/ledger/movements";
import { computeNextDue } from "@/lib/reminders";

import type { RecurringPayment } from "@/types/db";
import type { Movement } from "@/types/ledger";

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
  movement: Movement,
  fixedLabels: string[],
  recurringNotes: Set<string>,
): boolean {
  if (movement.isFixed === false) return false;
  if (movement.isFixed === true) return true;
  if (movement.recurringId != null) return true;
  const normalized = normalizeFixedLabel(movement.note);
  if (normalized === "") return false;
  if (fixedLabels.includes(normalized)) return true;
  return recurringNotes.has(normalized);
}

export function splitFixedVariable(
  movements: Movement[],
  fixedLabels: string[],
  recurringNotes: Set<string>,
): { fixed: Movement[]; variable: Movement[] } {
  const fixed: Movement[] = [];
  const variable: Movement[] = [];
  for (const movement of movements) {
    if (isFixedTransaction(movement, fixedLabels, recurringNotes)) {
      fixed.push(movement);
    } else {
      variable.push(movement);
    }
  }
  return { fixed, variable };
}

export const REMINDER_AMOUNT_TOLERANCE = 0.1;
export const REMINDER_MIN_LABEL_LENGTH = 4;

function isWordBoundary(char: string | undefined): boolean {
  return char === undefined || !/[\p{L}\p{N}]/u.test(char);
}

function containsAsWords(note: string, label: string): boolean {
  let index = note.indexOf(label);
  while (index !== -1) {
    if (
      isWordBoundary(note[index - 1]) &&
      isWordBoundary(note[index + label.length])
    ) {
      return true;
    }
    index = note.indexOf(label, index + 1);
  }
  return false;
}

export function matchesReminderWithoutLink(
  movement: Movement,
  reminder: RecurringPayment,
): boolean {
  if (movement.recurringId != null) return false;
  const flow = simpleFlow(movement);
  if (!flow || flow.kind !== "expense") return false;
  const label = normalizeFixedLabel(reminder.label);
  const note = normalizeFixedLabel(movement.note);
  if (label === "" || note === "") return false;
  const exactLabel = note === label;
  if (!exactLabel) {
    if (label.length < REMINDER_MIN_LABEL_LENGTH) return false;
    if (!containsAsWords(note, label)) return false;
  }
  if (reminder.amount == null) return exactLabel;
  if (reminder.currency == null) return false;
  const amount = reminder.amount;
  return [flow, spentFlow(movement)].some(
    (candidate) =>
      candidate !== null &&
      candidate.currency === reminder.currency &&
      Math.abs(candidate.amount - amount) <= amount * REMINDER_AMOUNT_TOLERANCE,
  );
}

export function matchesReminder(
  movement: Movement,
  reminder: RecurringPayment,
): boolean {
  return (
    movement.recurringId === reminder.id ||
    matchesReminderWithoutLink(movement, reminder)
  );
}

export function excludePaidReminders(
  reminders: RecurringPayment[],
  monthMovements: Movement[],
): RecurringPayment[] {
  return reminders.filter((reminder) => {
    const matchingTxs = monthMovements.filter((movement) =>
      matchesReminder(movement, reminder),
    );
    if (matchingTxs.length === 0) return true;

    if (reminder.last_paid_on == null) {
      return !matchingTxs.some((tx) => tx.occurredOn >= reminder.next_due_on);
    }

    const expectedNextDue = computeNextDue(
      reminder.last_paid_on,
      reminder.frequency,
      reminder.interval_months,
    );
    const nextDueIsTrustworthy = expectedNextDue === reminder.next_due_on;

    if (nextDueIsTrustworthy) {
      return !matchingTxs.some((tx) => tx.occurredOn >= reminder.next_due_on);
    }
    return !matchingTxs.some(
      (tx) => tx.occurredOn >= (reminder.last_paid_on as string),
    );
  });
}
