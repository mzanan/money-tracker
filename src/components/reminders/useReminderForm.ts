"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { createReminder, updateReminder } from "@/lib/actions/reminders";
import { computeNextDue } from "@/lib/reminders";

import type { RecurringFrequency, RecurringPayment } from "@/types/db";

export type ReminderSeed = {
  label?: string;
  amount?: number | null;
  currency?: string | null;
  category?: string | null;
  source?: string | null;
  frequency?: RecurringFrequency;
  intervalMonths?: number | null;
  installmentsTotal?: number | null;
  lastPaidOn?: string | null;
  nextDueOn?: string;
  note?: string | null;
};

interface Params {
  reminder?: RecurringPayment;
  seed?: ReminderSeed;
  onSaved?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useReminderForm({
  reminder,
  seed,
  onSaved,
  open: openProp,
  onOpenChange,
}: Params) {
  const settings = useSettings();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) setOpenState(next);
  };
  const { run, pending } = useServerAction();

  const isEdit = Boolean(reminder);
  const base: ReminderSeed = reminder
    ? {
        label: reminder.label,
        amount: reminder.amount,
        currency: reminder.currency,
        category: reminder.category,
        source: reminder.source,
        frequency: reminder.frequency,
        intervalMonths: reminder.interval_months,
        installmentsTotal: reminder.installments_total,
        lastPaidOn: reminder.last_paid_on,
        nextDueOn: reminder.next_due_on,
        note: reminder.note,
      }
    : (seed ?? {});

  const [label, setLabel] = useState(base.label ?? "");
  const [amount, setAmount] = useState(
    base.amount != null ? String(base.amount) : "",
  );
  const [currency, setCurrency] = useState(
    base.currency ?? settings.base_currency,
  );
  const [category, setCategory] = useState(base.category ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    base.frequency ?? "MONTHLY",
  );
  const [intervalMonths, setIntervalMonths] = useState(
    base.intervalMonths != null ? String(base.intervalMonths) : "6",
  );
  const [installments, setInstallments] = useState(
    base.installmentsTotal != null ? String(base.installmentsTotal) : "",
  );
  const [lastPaidOn, setLastPaidOn] = useState(base.lastPaidOn ?? "");
  const [nextDueOn, setNextDueOn] = useState(base.nextDueOn ?? "");
  const [note, setNote] = useState(base.note ?? "");

  function recalc() {
    const from = lastPaidOn || nextDueOn;
    if (!from) return;
    setNextDueOn(computeNextDue(from, frequency, Number(intervalMonths) || 1));
  }

  function recalcFrom(
    nextLastPaid: string,
    nextFrequency: RecurringFrequency,
    nextInterval: string,
  ) {
    if (!nextLastPaid) return;
    setNextDueOn(
      computeNextDue(nextLastPaid, nextFrequency, Number(nextInterval) || 1),
    );
  }

  function reset() {
    setLabel(base.label ?? "");
    setAmount(base.amount != null ? String(base.amount) : "");
    setCurrency(base.currency ?? settings.base_currency);
    setCategory(base.category ?? "");
    setFrequency(base.frequency ?? "MONTHLY");
    setIntervalMonths(
      base.intervalMonths != null ? String(base.intervalMonths) : "6",
    );
    setInstallments(
      base.installmentsTotal != null ? String(base.installmentsTotal) : "",
    );
    setLastPaidOn(base.lastPaidOn ?? "");
    setNextDueOn(base.nextDueOn ?? "");
    setNote(base.note ?? "");
  }

  function submit() {
    const parsedAmount = amount.trim() ? Number(amount) : null;
    const payload = {
      label: label.trim(),
      amount: parsedAmount && parsedAmount > 0 ? parsedAmount : null,
      currency: currency || null,
      category: category.trim() || null,
      frequency,
      intervalMonths:
        frequency === "CUSTOM_MONTHS" ? Number(intervalMonths) || 1 : null,
      installmentsTotal:
        installments.trim() && Number(installments) > 0
          ? Math.floor(Number(installments))
          : null,
      lastPaidOn: lastPaidOn || null,
      nextDueOn,
      source: base.source ?? null,
      note: note.trim() || null,
    };

    run<unknown>(
      () =>
        reminder
          ? updateReminder({ ...payload, id: reminder.id })
          : createReminder(payload),
      {
        success: isEdit ? "Reminder updated" : "Reminder saved",
        onSuccess: () => {
          setOpen(false);
          onSaved?.();
        },
      },
    );
  }

  const currencies = settings.currencies.includes(currency)
    ? settings.currencies
    : [currency, ...settings.currencies];

  return {
    open,
    setOpen,
    reset,
    isEdit,
    label,
    setLabel,
    note,
    setNote,
    amount,
    setAmount,
    currency,
    setCurrency,
    currencies,
    frequency,
    setFrequency,
    recalc,
    recalcFrom,
    intervalMonths,
    setIntervalMonths,
    installments,
    setInstallments,
    lastPaidOn,
    setLastPaidOn,
    nextDueOn,
    setNextDueOn,
    submit,
    pending,
  };
}
