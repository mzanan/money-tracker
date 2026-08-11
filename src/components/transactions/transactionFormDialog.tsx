"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TransactionFormFields } from "./transactionFormFields";
import { useTransactionForm, type TransactionSeed } from "./useTransactionForm";

export function TransactionFormDialog({
  seed,
  txId,
  locked,
  open,
  onOpenChange,
  title,
  description: dialogDescription,
  submitLabel,
  successMessage,
  onCreated,
}: {
  seed: TransactionSeed;
  txId?: string;
  locked?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  successMessage?: string;
  onCreated?: (id: string) => void;
}) {
  const form = useTransactionForm({
    seed,
    txId,
    open,
    onOpenChange,
    successMessage,
    onCreated,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <TransactionFormFields form={form} txId={txId} locked={locked} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
