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
import type { PendingTransfer } from "@/lib/ledger/movements";

import { CreditTransferFields } from "./creditTransferFields";
import copy from "./creditTransfer.json";
import { useCreditTransfer } from "./useCreditTransfer";

export function CreditTransferDialog({
  transfer,
  open,
  onOpenChange,
}: {
  transfer: PendingTransfer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useCreditTransfer({
    transfer,
    onDone: () => onOpenChange(false),
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>{copy.description}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <CreditTransferFields
            idPrefix="credit-dialog"
            transfer={transfer}
            form={form}
          />
        </DrawerBody>
        <DrawerActions
          onCancel={() => onOpenChange(false)}
          onSubmit={form.submit}
          submitLabel="Confirm"
          pending={form.pending}
          disabled={!form.canSubmit}
        />
      </DrawerContent>
    </Drawer>
  );
}
