"use client";

import { Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/ui/stepShell";
import { useSettings } from "@/hooks/useSettings";

import { TransferFeeSection } from "./transferFeeSection";
import { useMarkTransferDialog } from "./useMarkTransferDialog";

export function MarkTransferStep({
  txId,
  txSource,
  txCurrency,
  txAmount,
  onBack,
}: {
  txId: string;
  txSource: string;
  txCurrency: string;
  txAmount: number;
  onBack: () => void;
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
    setReceivedCurrency,
    destinationCurrency,
    preview,
    pending,
    submit,
  } = useMarkTransferDialog({
    txId,
    txSource,
    txCurrency,
    txAmount,
    open: true,
    onOpenChange: (open) => {
      if (!open) onBack();
    },
  });

  return (
    <StepShell
      title="Mark as a transfer"
      description="Which account did this money move to or from? It creates the matching entry there and both are left out of your totals."
      onBack={onBack}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button disabled={!selected || pending} onClick={submit}>
            {pending && <Loader2Icon className="animate-spin" />}
            Confirm
          </Button>
        </>
      }
    >
      <AccountSelect
        sources={sources}
        value={selected}
        onValueChange={setSelected}
        emptyMessage="No other account to pick. Import or add one first."
      />
      <TransferFeeSection
        idPrefix="transfer-step"
        fees={fees}
        onFeesChange={setFees}
        sourceCurrency={txCurrency}
        destinationCurrency={destinationCurrency}
        currencies={settings.currencies}
        receivedAmount={receivedAmount}
        onReceivedAmountChange={setReceivedAmount}
        receivedCurrency={receivedCurrency}
        onReceivedCurrencyChange={setReceivedCurrency}
        preview={preview}
      />
    </StepShell>
  );
}
