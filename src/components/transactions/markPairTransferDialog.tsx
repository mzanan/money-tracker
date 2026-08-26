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
import { ErrorText } from "@/components/ui/errorText";
import { formatMoney } from "@/lib/currency";
import type { Transaction } from "@/types/db";

import { TransferFeeFields } from "./transferFeeFields";
import { useMarkPairTransferDialog } from "./useMarkPairTransferDialog";

export function MarkPairTransferDialog({
  open,
  onOpenChange,
  expenseTx,
  incomeTx,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseTx: Transaction;
  incomeTx: Transaction;
  onSuccess: () => void;
}) {
  const { sameCurrency, delta, fees, setFees, deltaMismatch, pending, submit } =
    useMarkPairTransferDialog({ expenseTx, incomeTx, onSuccess });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>Mark as a transfer</DrawerTitle>
          <DrawerDescription>
            Both transactions will be linked and left out of your totals.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          {sameCurrency && delta > 0 && (
            <p className="text-muted-foreground text-sm">
              The amounts differ by{" "}
              {formatMoney(delta, expenseTx.currency_original)}. Split it
              between the accounts that charged it.
            </p>
          )}
          <TransferFeeFields
            idPrefix="pair-transfer"
            fees={fees}
            onChange={setFees}
            sourceCurrency={expenseTx.currency_original}
            destinationCurrency={incomeTx.currency_original}
          />
          {deltaMismatch && (
            <ErrorText>
              The fees must add up to{" "}
              {formatMoney(delta, expenseTx.currency_original)}.
            </ErrorText>
          )}
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
            disabled={pending || deltaMismatch}
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
