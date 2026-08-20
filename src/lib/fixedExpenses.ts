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
): boolean {
  if (tx.is_fixed === false) return false;
  if (tx.is_fixed === true) return true;
  if (tx.recurring_id != null) return true;
  const normalized = normalizeFixedLabel(tx.note);
  if (normalized === "") return false;
  return fixedLabels.includes(normalized);
}

export function splitFixedVariable(
  txs: Transaction[],
  fixedLabels: string[],
): { fixed: Transaction[]; variable: Transaction[] } {
  const fixed: Transaction[] = [];
  const variable: Transaction[] = [];
  for (const tx of txs) {
    if (isFixedTransaction(tx, fixedLabels)) fixed.push(tx);
    else variable.push(tx);
  }
  return { fixed, variable };
}

export function excludePaidReminders(
  reminders: RecurringPayment[],
  monthTransactions: Transaction[],
  yearMonth: string,
): RecurringPayment[] {
  const paidRecurringIds = new Set(
    monthTransactions
      .filter((tx) => tx.recurring_id != null)
      .map((tx) => tx.recurring_id as string),
  );
  return reminders.filter((reminder) => {
    if (reminder.last_paid_on == null) return true;
    if (reminder.last_paid_on.slice(0, 7) !== yearMonth) return true;
    return !paidRecurringIds.has(reminder.id);
  });
}
