"use client";


import { DrawerActions } from "@/components/ui/drawerActions";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
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
    kindLocked: locked,
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

        <DrawerActions
          onCancel={() => onOpenChange(false)}
          onSubmit={form.submit}
          submitLabel={submitLabel}
          pending={form.pending}
          disabled={!form.canSubmit}
        />
      </DrawerContent>
    </Drawer>
  );
}
