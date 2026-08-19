"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/ui/stepShell";
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
    <StepShell
      title={`Pay ${reminderLabel}`}
      description={
        <span className="tabular-nums">
          {formatMoney(seed.amount, seed.currency)}
        </span>
      }
      onBack={onBack}
      backAriaLabel="Back to candidates"
      footerClassName="bg-card border-transparent"
      footer={
        <>
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
        </>
      }
    >
      <TransactionFormFields form={form} />
    </StepShell>
  );
}
