"use client";

import { ChevronLeftIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <div className="grid gap-4">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={onBack}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0 pt-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>

      <TransactionFormFields form={form} txId={txId} locked={locked} />

      <div className="flex justify-end gap-2">
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
      </div>
    </div>
  );
}
