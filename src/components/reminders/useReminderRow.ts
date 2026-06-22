"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import {
  deleteReminder,
  getReminderPayOptions,
  markReminderPaid,
  type ReminderPaymentCandidate,
} from "@/lib/actions/reminders";
import { daysBetween, frequencyLabel } from "@/lib/reminders";

import type { RecurringPayment } from "@/types/db";

export function useReminderRow(reminder: RecurringPayment, today: string) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOptions, setPayOptions] = useState<{
    suggested: ReminderPaymentCandidate[];
    recent: ReminderPaymentCandidate[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const { run, pending } = useServerAction();
  const busy = pending || checking;

  const diff = daysBetween(today, reminder.next_due_on);
  const tone =
    diff < 0
      ? "text-destructive"
      : diff <= 7
        ? "text-warning"
        : "text-muted-foreground";

  const metaSegments = [
    frequencyLabel(reminder.frequency, reminder.interval_months),
  ];
  if (reminder.category) metaSegments.push(reminder.category);
  if (reminder.installments_total != null) {
    metaSegments.push(
      `${reminder.installments_paid}/${reminder.installments_total} paid`,
    );
  }

  async function handleMarkPaid() {
    setChecking(true);
    const res = await getReminderPayOptions(reminder.id);
    setChecking(false);
    setPayOptions(res.ok ? res.data! : { suggested: [], recent: [] });
  }

  function confirmPaid(linkTransactionId?: string) {
    setPayOptions(null);
    run(
      () =>
        markReminderPaid(
          reminder.id,
          undefined,
          linkTransactionId ? { linkTransactionId } : undefined,
        ),
      {
        success: (data) =>
          data?.completed
            ? "Last payment, reminder completed"
            : data?.linked
              ? "Marked paid, linked to the existing payment"
              : data?.expenseAdded
                ? "Marked paid, expense added"
                : "Marked paid, next due updated",
      },
    );
  }

  function markPaidOnly() {
    setPayOptions(null);
    run(() => markReminderPaid(reminder.id, undefined, { skipExpense: true }), {
      success: (data) =>
        data?.completed
          ? "Last payment, reminder completed"
          : "Marked paid, next due updated",
    });
  }

  function handleDelete() {
    run(() => deleteReminder(reminder.id), {
      confirm: `Delete reminder "${reminder.label}"?`,
      success: "Deleted",
    });
  }

  return {
    editOpen,
    setEditOpen,
    payOptions,
    setPayOptions,
    busy,
    pending,
    diff,
    tone,
    metaSegments,
    handleMarkPaid,
    confirmPaid,
    markPaidOnly,
    handleDelete,
  };
}
