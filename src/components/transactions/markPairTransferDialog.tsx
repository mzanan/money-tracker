"use client";

import { Loader2Icon } from "lucide-react";

import { AmountInput } from "@/components/ui/amountInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getCurrency } from "@/lib/constants/currencies";
import { formatMoney } from "@/lib/currency";
import type { Transaction } from "@/types/db";

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
  const {
    sameCurrency,
    delta,
    recordFeeDelta,
    setRecordFeeDelta,
    feeAmount,
    setFeeAmount,
    pending,
    submit,
  } = useMarkPairTransferDialog({ expenseTx, incomeTx, onSuccess });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as a transfer</DialogTitle>
          <DialogDescription>
            Both transactions will be linked and left out of your totals.
          </DialogDescription>
        </DialogHeader>
        {sameCurrency && delta > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0 text-sm">
              Record the difference (
              {formatMoney(delta, expenseTx.currency_original)}) as a
              transfer fee
            </p>
            <Switch
              checked={recordFeeDelta}
              onCheckedChange={setRecordFeeDelta}
              aria-label="Record the difference as a transfer fee"
            />
          </div>
        )}
        {!sameCurrency && (
          <div className="grid gap-1.5">
            <Label htmlFor="pair-transfer-fee">
              Fee ({expenseTx.currency_original}), optional
            </Label>
            <AmountInput
              id="pair-transfer-fee"
              value={feeAmount}
              onChange={setFeeAmount}
              decimals={getCurrency(expenseTx.currency_original).decimals}
              placeholder="0"
            />
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={submit}>
            {pending && <Loader2Icon className="animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
