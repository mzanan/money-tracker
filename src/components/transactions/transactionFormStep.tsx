"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/ui/stepShell";

import { TransactionFormFields } from "./transactionFormFields";
import { useTransactionForm, type TransactionSeed } from "./useTransactionForm";

export function TransactionFormStep({
  seed,
  txId,
  locked,
  title,
  description,
  submitLabel,
  successMessage,
  onCreated,
  onBack,
}: {
  seed: TransactionSeed;
  txId?: string;
  locked?: boolean;
  title: string;
  description: string;
  submitLabel: string;
  successMessage?: string;
  onCreated?: (id: string) => void;
  onBack: () => void;
}) {
  const form = useTransactionForm({
    seed,
    txId,
    open: true,
    onOpenChange: (open) => {
      if (!open) onBack();
    },
    successMessage,
    onCreated,
  });

  return (
    <StepShell
      title={title}
      description={description}
      onBack={onBack}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button
            onClick={form.submit}
            disabled={
              form.pending ||
              (!txId && (!form.source || form.sourceOptions === null))
            }
          >
            {form.pending && <Loader2Icon className="animate-spin" />}
            {submitLabel}
          </Button>
        </>
      }
    >
      <TransactionFormFields form={form} txId={txId} locked={locked} />
    </StepShell>
  );
}
