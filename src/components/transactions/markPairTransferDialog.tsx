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
import { ErrorText } from "@/components/ui/errorText";
import { formatMoney } from "@/lib/currency";
import type { RowFacts } from "@/types/ledger";
import { INCOME_EXCEEDS_EXPENSE_ERROR } from "@/lib/transfer";

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
  expenseTx: RowFacts;
  incomeTx: RowFacts;
  onSuccess: () => void;
}) {
  const {
    sameCurrency,
    delta,
    fees,
    setFees,
    deltaMismatch,
    incomeExceeds,
    pending,
    submit,
  } = useMarkPairTransferDialog({ expenseTx, incomeTx, onSuccess });

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
              {formatMoney(delta, expenseTx.currency, { precise: true })}. Split
              it between the accounts that charged it.
            </p>
          )}
          <TransferFeeFields
            idPrefix="pair-transfer"
            fees={fees}
            onChange={setFees}
            sourceCurrency={expenseTx.currency}
            destinationCurrency={incomeTx.currency}
          />
          {incomeExceeds && (
            <ErrorText>{INCOME_EXCEEDS_EXPENSE_ERROR}</ErrorText>
          )}
          {deltaMismatch && (
            <ErrorText>
              The fees must add up to{" "}
              {formatMoney(delta, expenseTx.currency, { precise: true })}.
            </ErrorText>
          )}
        </DrawerBody>
        <DrawerActions
          onCancel={() => onOpenChange(false)}
          onSubmit={submit}
          submitLabel="Confirm"
          pending={pending}
          disabled={deltaMismatch || incomeExceeds}
        />
      </DrawerContent>
    </Drawer>
  );
}
