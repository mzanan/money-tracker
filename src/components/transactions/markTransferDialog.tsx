"use client";

import { Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
import { AmountInput } from "@/components/ui/amountInput";
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
import { Label } from "@/components/ui/label";
import { getCurrency } from "@/lib/constants/currencies";

import { useMarkTransferDialog } from "./useMarkTransferDialog";

export function MarkTransferDialog({
  txId,
  txSource,
  txCurrency,
  open,
  onOpenChange,
}: {
  txId: string;
  txSource: string;
  txCurrency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { sources, selected, setSelected, fee, setFee, pending, submit } =
    useMarkTransferDialog({ txId, txSource, open, onOpenChange });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>Mark as a transfer</DrawerTitle>
          <DrawerDescription>
            Which account did this money move to or from? It creates the
            matching entry there and both are left out of your totals.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <AccountSelect
            sources={sources}
            value={selected}
            onValueChange={setSelected}
            emptyMessage="No other account to pick. Import or add one first."
          />
          <div className="grid gap-1.5">
            <Label htmlFor="transfer-fee">Fee ({txCurrency}), optional</Label>
            <AmountInput
              id="transfer-fee"
              value={fee}
              onChange={setFee}
              decimals={getCurrency(txCurrency).decimals}
              placeholder="0"
            />
          </div>
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
            disabled={!selected || pending}
            onClick={submit}
          >
            {pending && <Loader2Icon className="animate-spin" />}
            Confirm
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
