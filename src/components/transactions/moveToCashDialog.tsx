"use client";

import { Loader2Icon } from "lucide-react";

import { AmountCurrencyField } from "@/components/ui/amountCurrencyField";
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

import { MOVE_TO_CASH_COPY } from "./moveToCashCopy";
import { useMoveToCash } from "./useMoveToCash";

export function MoveToCashDialog({
  txId,
  txNote,
  open,
  onOpenChange,
}: {
  txId: string;
  txNote: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    currencies,
    amount,
    setAmount,
    currency,
    setCurrency,
    pending,
    submit,
  } = useMoveToCash({ txId, txNote, onOpenChange });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>{MOVE_TO_CASH_COPY.title}</DrawerTitle>
          <DrawerDescription>{MOVE_TO_CASH_COPY.description}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <AmountCurrencyField
            id="move-to-cash"
            label={MOVE_TO_CASH_COPY.amountLabel}
            value={amount}
            onChange={setAmount}
            currency={currency}
            onCurrencyChange={setCurrency}
            currencies={currencies}
            currencyAriaLabel={MOVE_TO_CASH_COPY.currencyAriaLabel}
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
          <Button className="sm:flex-1" disabled={pending} onClick={submit}>
            {pending && <Loader2Icon className="animate-spin" />}
            {MOVE_TO_CASH_COPY.submitLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
