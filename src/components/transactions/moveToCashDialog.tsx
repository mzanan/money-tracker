"use client";


import { AmountCurrencyField } from "@/components/ui/amountCurrencyField";
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
        <DrawerActions
          onCancel={() => onOpenChange(false)}
          onSubmit={submit}
          submitLabel={MOVE_TO_CASH_COPY.submitLabel}
          pending={pending}
        />
      </DrawerContent>
    </Drawer>
  );
}
