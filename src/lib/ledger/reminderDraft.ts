import { MANUAL_SOURCE } from "@/lib/constants/sources";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { flowLines } from "@/lib/ledger/builders";
import type { LedgerDraft } from "@/lib/ledger/posting";
import { hasStorageScale, type ScaleOf } from "@/lib/ledger/scale";
import type { RecurringPayment } from "@/types/db";

export function reminderExpenseDraft(
  reminder: RecurringPayment,
  day: string,
  scaleOf: ScaleOf,
): LedgerDraft | null {
  if (reminder.amount == null || !reminder.currency) return null;
  if (!hasStorageScale(reminder.currency, scaleOf)) return null;
  return {
    occurredOn: day,
    occurredAt: new Date().toISOString(),
    note: reminder.label.trim() || null,
    comment: null,
    tags: [],
    recurringId: reminder.id,
    isFixed: null,
    budgetMonth: null,
    lines: flowLines({
      kind: "expense",
      source: MANUAL_SOURCE,
      money: { amount: reminder.amount, currency: reminder.currency },
      occurredOn: day,
      scaleOf,
    }),
    externalRefs: [
      {
        origin: MANUAL_SOURCE,
        externalId: `${EXTERNAL_ID_PREFIX.reminder}${reminder.id}:${day}`,
      },
    ],
  };
}
