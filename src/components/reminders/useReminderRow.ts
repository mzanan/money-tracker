"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { deleteReminder } from "@/lib/actions/reminders";
import { daysBetween, reminderMetaSegments } from "@/lib/reminders";
import { useDrawerStep } from "@/components/transactions/drawerStepContext";

import type { RecurringPayment } from "@/types/db";

export function useReminderRow(reminder: RecurringPayment, today: string) {
  const [editOpen, setEditOpen] = useState(false);
  const stepApi = useDrawerStep();
  const { run, pending } = useServerAction();

  const diff = daysBetween(today, reminder.next_due_on);
  const tone =
    diff < 0
      ? "text-destructive"
      : diff <= 7
        ? "text-warning"
        : "text-muted-foreground";

  const metaSegments = reminderMetaSegments(reminder);

  function handleDelete() {
    run(() => deleteReminder(reminder.id), {
      confirm: `Delete reminder "${reminder.label}"?`,
      success: "Deleted",
    });
  }

  return {
    editOpen,
    setEditOpen,
    pending,
    diff,
    tone,
    metaSegments,
    handleDelete,
    stepApi,
  };
}
