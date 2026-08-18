"use client";

import { ChevronLeftIcon, Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
import { AmountInput } from "@/components/ui/amountInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
    <div className="grid gap-4">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={onBack}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0 pt-1">
          <p className="text-sm font-semibold">Mark as a transfer</p>
          <p className="text-muted-foreground text-xs">
            Which account did this money move to or from? It creates the
            matching entry there and both are left out of your totals.
          </p>
        </div>
      </div>

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

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>
          Cancel
        </Button>
        <Button disabled={!selected || pending} onClick={submit}>
          {pending && <Loader2Icon className="animate-spin" />}
          Confirm
        </Button>
      </div>
    </div>
  );
}
