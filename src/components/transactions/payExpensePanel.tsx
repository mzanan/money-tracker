"use client";

import { ChevronLeftIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency";

import { TransactionFormFields } from "./transactionFormFields";
import { useTransactionForm, type TransactionSeed } from "./useTransactionForm";

export function PayExpensePanel({
  reminderLabel,
  seed,
  onBack,
  onCreated,
}: {
  reminderLabel: string;
  seed: TransactionSeed;
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const form = useTransactionForm({
    seed,
    open: true,
    onOpenChange: (open) => {
      if (!open) onBack();
    },
    onCreated,
  });

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to candidates"
          onClick={onBack}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Pay {reminderLabel}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {formatMoney(seed.amount, seed.currency)}
          </p>
        </div>
      </div>

      <TransactionFormFields form={form} />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={form.submit}
          disabled={form.pending || !form.source || form.sourceOptions === null}
        >
          {form.pending && <Loader2Icon className="animate-spin" />}
          Save and mark paid
        </Button>
      </div>
    </div>
  );
}
