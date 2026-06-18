"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { createReminder, updateReminder } from "@/lib/actions/reminders";
import { computeNextDue, FREQUENCY_OPTIONS } from "@/lib/reminders";
import { useSettings } from "@/hooks/useSettings";

import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { RecurringFrequency, RecurringPayment } from "@/types/db";

type Seed = {
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

type Props = {
  trigger?: React.ReactNode;
  reminder?: RecurringPayment;
  seed?: Seed;
  title?: string;
  onSaved?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ReminderForm({
  trigger,
  reminder,
  seed,
  title,
  onSaved,
  open: openProp,
  onOpenChange,
}: Props) {
  const settings = useSettings();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) setOpenState(next);
  };
  const { run, pending } = useServerAction();

  const isEdit = Boolean(reminder);
  const base: Seed = reminder
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
    setNextDueOn(
      computeNextDue(from, frequency, Number(intervalMonths) || 1),
    );
  }

  function recalcFrom(
    nextLastPaid: string,
    nextFrequency: RecurringFrequency,
    nextInterval: string,
  ) {
    if (!nextLastPaid) return;
    setNextDueOn(
      computeNextDue(
        nextLastPaid,
        nextFrequency,
        Number(nextInterval) || 1,
      ),
    );
  }

  function reset() {
    setLabel(base.label ?? "");
    setAmount(base.amount != null ? String(base.amount) : "");
    setCurrency(base.currency ?? settings.base_currency);
    setCategory(base.category ?? "");
    setFrequency(base.frequency ?? "MONTHLY");
    setIntervalMonths(base.intervalMonths != null ? String(base.intervalMonths) : "6");
    setInstallments(base.installmentsTotal != null ? String(base.installmentsTotal) : "");
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? (isEdit ? "Edit reminder" : "New reminder")}</DialogTitle>
          <DialogDescription>
            Track a recurring payment and when it&apos;s next due.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="reminder-label">Name</Label>
            <Input
              id="reminder-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Rent, gym, motorbike…"
              maxLength={80}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reminder-note">Note (optional)</Label>
            <Textarea
              id="reminder-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's this for?"
              rows={2}
              maxLength={280}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="reminder-amount">Amount (optional)</Label>
              <Input
                id="reminder-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder-currency">Currency</Label>
              <CurrencySelect
                id="reminder-currency"
                value={currency}
                onValueChange={setCurrency}
                currencies={currencies}
                className="w-24"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="reminder-freq">Repeats</Label>
              <Select
                value={frequency}
                onValueChange={(v) => {
                  const next = v as RecurringFrequency;
                  setFrequency(next);
                  recalcFrom(lastPaidOn, next, intervalMonths);
                }}
              >
                <SelectTrigger id="reminder-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {frequency === "CUSTOM_MONTHS" && (
              <div className="grid gap-2">
                <Label htmlFor="reminder-interval">Months</Label>
                <Input
                  id="reminder-interval"
                  inputMode="numeric"
                  value={intervalMonths}
                  onChange={(e) => {
                    setIntervalMonths(e.target.value);
                    recalcFrom(lastPaidOn, frequency, e.target.value);
                  }}
                  placeholder="6"
                />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reminder-installments">Ends after (optional)</Label>
            <Input
              id="reminder-installments"
              inputMode="numeric"
              value={installments}
              onChange={(e) =>
                setInstallments(e.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="number of payments, blank = forever"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="reminder-lastpaid">Last paid (optional)</Label>
              <Input
                id="reminder-lastpaid"
                type="date"
                value={lastPaidOn}
                onChange={(e) => {
                  setLastPaidOn(e.target.value);
                  recalcFrom(e.target.value, frequency, intervalMonths);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder-due">Next due</Label>
              <Input
                id="reminder-due"
                type="date"
                value={nextDueOn}
                onChange={(e) => setNextDueOn(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={recalc}
            className="text-primary justify-self-start text-xs hover:underline"
          >
            Recalculate next due from last paid
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !label.trim() || !nextDueOn}
          >
            {pending && <Loader2Icon className="animate-spin" />}
            {isEdit ? "Save" : "Add reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
