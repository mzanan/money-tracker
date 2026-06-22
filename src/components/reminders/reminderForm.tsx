"use client";

import { Loader2Icon } from "lucide-react";

import { FREQUENCY_OPTIONS } from "@/lib/reminders";

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

import { useReminderForm, type ReminderSeed } from "./useReminderForm";

import type { RecurringFrequency, RecurringPayment } from "@/types/db";

type Props = {
  trigger?: React.ReactNode;
  reminder?: RecurringPayment;
  seed?: ReminderSeed;
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
  const {
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
  } = useReminderForm({ reminder, seed, onSaved, open: openProp, onOpenChange });

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
          <DialogTitle>
            {title ?? (isEdit ? "Edit reminder" : "New reminder")}
          </DialogTitle>
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
