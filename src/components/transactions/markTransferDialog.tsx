"use client";

import { Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
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
import { useSettings } from "@/hooks/useSettings";

import { TransferCreditFields } from "./transferCreditFields";
import { TransferFeeSection } from "./transferFeeSection";
import { useMarkTransferDialog } from "./useMarkTransferDialog";

export function MarkTransferDialog({
  txId,
  txSource,
  txCurrency,
  txAmount,
  txDate,
  txKind,
  open,
  onOpenChange,
}: {
  txId: string;
  txSource: string;
  txCurrency: string;
  txAmount: number;
  txDate: string;
  txKind: "expense" | "income";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const settings = useSettings();
  const {
    sources,
    selected,
    setSelected,
    fees,
    setFees,
    receivedAmount,
    setReceivedAmount,
    receivedCurrency,
    receivedRequired,
    setReceivedCurrency,
    destinationCurrency,
    preview,
    notReceived,
    setNotReceived,
    creditedOn,
    setCreditedOn,
    pending,
    submit,
  } = useMarkTransferDialog({
    txId,
    txSource,
    txCurrency,
    txAmount,
    txDate,
    open,
    onOpenChange,
  });

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
          {txKind === "expense" && (
            <TransferCreditFields
              idPrefix="transfer-dialog"
              notReceived={notReceived}
              onNotReceivedChange={setNotReceived}
              creditedOn={creditedOn}
              onCreditedOnChange={setCreditedOn}
              sentOn={txDate}
            />
          )}
          <TransferFeeSection
            idPrefix="transfer"
            fees={fees}
            onFeesChange={setFees}
            sourceCurrency={txCurrency}
            destinationCurrency={destinationCurrency}
            currencies={settings.currencies}
            receivedAmount={receivedAmount}
            onReceivedAmountChange={setReceivedAmount}
            receivedCurrency={receivedCurrency}
            receivedRequired={receivedRequired}
            onReceivedCurrencyChange={setReceivedCurrency}
            preview={preview}
            txKind={txKind}
            pending={notReceived}
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
