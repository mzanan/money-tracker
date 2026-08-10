"use client";

import { Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
import { AmountInput } from "@/components/ui/amountInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as a transfer</DialogTitle>
          <DialogDescription>
            Which account did this money move to or from? It creates the
            matching entry there and both are left out of your totals.
          </DialogDescription>
        </DialogHeader>
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
        <Button disabled={!selected || pending} onClick={submit}>
          {pending && <Loader2Icon className="animate-spin" />}
          Confirm
        </Button>
      </DialogContent>
    </Dialog>
  );
}
