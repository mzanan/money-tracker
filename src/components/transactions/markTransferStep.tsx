"use client";

import { Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
import { AmountInput } from "@/components/ui/amountInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StepShell } from "@/components/ui/stepShell";
import { getCurrency } from "@/lib/constants/currencies";

import { useMarkTransferDialog } from "./useMarkTransferDialog";

export function MarkTransferStep({
  txId,
  txSource,
  txCurrency,
  onBack,
}: {
  txId: string;
  txSource: string;
  txCurrency: string;
  onBack: () => void;
}) {
  const { sources, selected, setSelected, fee, setFee, pending, submit } =
    useMarkTransferDialog({
      txId,
      txSource,
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
      <div className="grid gap-1.5">
        <Label htmlFor="transfer-fee-step">Fee ({txCurrency}), optional</Label>
        <AmountInput
          id="transfer-fee-step"
          value={fee}
          onChange={setFee}
          decimals={getCurrency(txCurrency).decimals}
          placeholder="0"
        />
      </div>
    </StepShell>
  );
}
