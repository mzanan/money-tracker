"use client";

import { Loader2Icon } from "lucide-react";

import { getCurrency } from "@/lib/constants/currencies";
import { FREQUENCY_OPTIONS } from "@/lib/reminders";

import { AmountInput } from "@/components/ui/amountInput";
import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepShell } from "@/components/ui/stepShell";
import { Textarea } from "@/components/ui/textarea";

import { useReminderForm, type ReminderSeed } from "./useReminderForm";

import type { RecurringFrequency, RecurringPayment } from "@/types/db";

export function ReminderFormStep({
  reminder,
  seed,
  title,
  onSaved,
  onBack,
}: {
  reminder?: RecurringPayment;
  seed?: ReminderSeed;
  title?: string;
  onSaved?: () => void;
  onBack: () => void;
}) {
  const {
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
  } = useReminderForm({
    reminder,
    seed,
    onSaved,
    open: true,
    onOpenChange: (open) => {
      if (!open) onBack();
    },
  });

  return (
    <StepShell
      title={title ?? (isEdit ? "Edit reminder" : "New reminder")}
      description="Track a recurring payment and when it's next due."
      onBack={onBack}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !label.trim() || !nextDueOn}
          >
            {pending && <Loader2Icon className="animate-spin" />}
            {isEdit ? "Save" : "Add reminder"}
          </Button>
        </>
      }
    >
      <div className="grid gap-2">
        <Label htmlFor="reminder-step-label">Name</Label>
        <Input
          id="reminder-step-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Rent, gym, motorbike…"
          maxLength={80}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="reminder-step-note">Note (optional)</Label>
        <Textarea
          id="reminder-step-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's this for?"
          rows={2}
          maxLength={280}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-2">
          <Label htmlFor="reminder-step-amount">Amount (optional)</Label>
          <AmountInput
            id="reminder-step-amount"
            value={amount}
            onChange={setAmount}
            decimals={getCurrency(currency).decimals}
            placeholder="0.00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reminder-step-currency">Currency</Label>
          <CurrencySelect
            id="reminder-step-currency"
            value={currency}
            onValueChange={setCurrency}
            currencies={currencies}
            className="w-24"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="reminder-step-freq">Repeats</Label>
          <Select
            value={frequency}
            onValueChange={(v) => {
              const next = v as RecurringFrequency;
              setFrequency(next);
              recalcFrom(lastPaidOn, next, intervalMonths);
            }}
          >
            <SelectTrigger id="reminder-step-freq">
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
            <Label htmlFor="reminder-step-interval">Months</Label>
            <Input
              id="reminder-step-interval"
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
        <Label htmlFor="reminder-step-installments">Ends after (optional)</Label>
        <Input
          id="reminder-step-installments"
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
          <Label htmlFor="reminder-step-lastpaid">Last paid (optional)</Label>
          <Input
            id="reminder-step-lastpaid"
            type="date"
            value={lastPaidOn}
            onChange={(e) => {
              setLastPaidOn(e.target.value);
              recalcFrom(e.target.value, frequency, intervalMonths);
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reminder-step-due">Next due</Label>
          <Input
            id="reminder-step-due"
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
    </StepShell>
  );
}
