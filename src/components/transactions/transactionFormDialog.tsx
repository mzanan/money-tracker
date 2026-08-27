"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{dialogDescription}</DrawerDescription>
        </DrawerHeader>

        <DrawerBody>
          <TransactionFormFields form={form} txId={txId} locked={locked} />
        </DrawerBody>

        <DrawerFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="ghost"
            className="sm:flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="sm:flex-1"
            onClick={form.submit}
            disabled={
              form.pending ||
              (!txId && (!form.source || form.sourceOptions === null)) ||
              (form.transferActive && !form.transferDraft.selected) ||
              (form.withdrawalActive && !form.withdrawalDraft.totalFilled)
            }
          >
            {form.pending && <Loader2Icon className="animate-spin" />}
            {submitLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
