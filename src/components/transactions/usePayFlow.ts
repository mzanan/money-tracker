"use client";

import { useRef, useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import {
  getReminderPayOptions,
  markReminderPaid,
  type ReminderPaymentCandidate,
} from "@/lib/actions/reminders";

import type { RecurringPayment } from "@/types/db";

type Step = "candidates" | "form";

export function usePayFlow(today: string) {
  const [activeReminder, setActiveReminder] = useState<RecurringPayment | null>(
    null,
  );
  const [step, setStep] = useState<Step>("candidates");
  const [payDay, setPayDay] = useState(today);
  const [payOptions, setPayOptions] = useState<{
    suggested: ReminderPaymentCandidate[];
    recent: ReminderPaymentCandidate[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(
    null,
  );
  const { run, pending } = useServerAction();
  const payRequestRef = useRef(0);

  async function fetchPayOptions(reminder: RecurringPayment, day: string) {
    if (reminder.amount == null) return;
    const requestId = ++payRequestRef.current;
    setChecking(true);
    const res = await getReminderPayOptions(reminder.id, day);
    if (requestId !== payRequestRef.current) return;
    setChecking(false);
    setPayOptions(res.ok ? res.data! : { suggested: [], recent: [] });
  }

  function start(reminder: RecurringPayment) {
    setActiveReminder(reminder);
    setStep("candidates");
    setPayDay(today);
    setPayOptions(null);
    fetchPayOptions(reminder, today);
  }

  function close() {
    setActiveReminder(null);
    setStep("candidates");
  }

  function choosePayDay(day: string) {
    setPayDay(day);
    setPayOptions(null);
    if (activeReminder) fetchPayOptions(activeReminder, day);
  }

  function openAddExpense() {
    setStep("form");
  }

  function backToCandidates() {
    setStep("candidates");
  }

  function handleExpenseCreated(transactionId: string) {
    confirmPaid(transactionId);
  }

  function confirmPaid(linkTransactionId?: string) {
    const reminder = activeReminder;
    if (!reminder) return;
    const day = payDay;
    setPendingReminderId(reminder.id);
    close();
    run(
      () =>
        markReminderPaid(
          reminder.id,
          day,
          linkTransactionId ? { linkTransactionId } : undefined,
        ),
      {
        success: (data) =>
          data?.completed
            ? "Last payment, reminder completed"
            : data?.linked
              ? "Marked paid, linked to the existing payment"
              : data?.expenseAdded
                ? "Expense added, marked paid"
                : "Marked paid, next due updated",
      },
    );
  }

  function markPaidOnly() {
    const reminder = activeReminder;
    if (!reminder) return;
    const day = payDay;
    setPendingReminderId(reminder.id);
    close();
    run(() => markReminderPaid(reminder.id, day, { skipExpense: true }), {
      success: (data) =>
        data?.completed
          ? "Last payment, reminder completed"
          : "Marked paid, next due updated",
    });
  }

  return {
    activeReminder,
    start,
    close,
    payDay,
    payOptions,
    checking,
    pending,
    pendingReminderId,
    choosePayDay,
    confirmPaid,
    markPaidOnly,
    step,
    openAddExpense,
    backToCandidates,
    handleExpenseCreated,
  };
}
