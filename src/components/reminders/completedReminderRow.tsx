import { CheckIcon } from "lucide-react";

import { IconCircle } from "@/components/ui/iconCircle";
import { formatMoney } from "@/lib/currency";
import { formatDateShort } from "@/lib/dates";
import { reminderMetaSegments } from "@/lib/reminders";

import type { RecurringPayment } from "@/types/db";

export function CompletedReminderRow({
  reminder,
}: {
  reminder: RecurringPayment;
}) {
  const metaSegments = reminderMetaSegments(reminder);

  return (
    <li className="flex items-center gap-3 rounded-2xl px-3 py-3 opacity-70">
      <IconCircle className="bg-surface-2 text-muted-foreground">
        <CheckIcon className="size-4" />
      </IconCircle>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-semibold">
            {reminder.label}
          </span>
          {reminder.amount != null && (
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatMoney(reminder.amount, reminder.currency ?? "USD")}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground text-meta truncate">
            {metaSegments.join(" · ")}
          </span>
          {reminder.last_paid_on && (
            <span className="text-muted-foreground shrink-0 text-caption font-medium tabular-nums">
              Paid {formatDateShort(reminder.last_paid_on)}
            </span>
          )}
        </div>
        {reminder.note && (
          <p className="text-muted-foreground/90 text-meta mt-1 truncate italic">
            {reminder.note}
          </p>
        )}
      </div>
    </li>
  );
}
