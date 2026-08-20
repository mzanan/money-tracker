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
): RecurringPayment[] {
  return reminders.filter(
    (reminder) =>
      !monthTransactions.some(
        (tx) =>
          tx.recurring_id === reminder.id &&
          tx.occurred_on >= reminder.next_due_on,
      ),
  );
}
