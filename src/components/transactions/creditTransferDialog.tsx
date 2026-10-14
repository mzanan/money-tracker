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
            disabled={!form.canSubmit}
            onClick={form.submit}
          >
            {form.pending && <Loader2Icon className="animate-spin" />}
            Confirm
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
