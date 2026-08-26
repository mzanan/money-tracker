"use client";

import { PlusIcon, XIcon } from "lucide-react";

import { AmountField } from "@/components/ui/amountCurrencyField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrency } from "@/lib/constants/currencies";

import type { FeePayer } from "@/lib/transfer";

export interface FeeDraft {
  amount: string;
  payer: FeePayer;
}

export const MAX_TRANSFER_FEES = 2;

export function TransferFeeFields({
  fees,
  onChange,
  sourceCurrency,
  destinationCurrency,
  idPrefix,
}: {
  fees: FeeDraft[];
  onChange: (fees: FeeDraft[]) => void;
  sourceCurrency: string;
  destinationCurrency: string;
  idPrefix: string;
}) {
  function update(index: number, patch: Partial<FeeDraft>) {
    onChange(fees.map((fee, i) => (i === index ? { ...fee, ...patch } : fee)));
  }

  return (
    <div className="grid gap-3">
      {fees.map((fee, index) => {
        const currency =
          fee.payer === "origin" ? sourceCurrency : destinationCurrency;
        return (
          <div key={index} className="flex items-end gap-2">
            <AmountField
              id={`${idPrefix}-fee-${index}`}
              label={`Fee (${currency})`}
              value={fee.amount}
              onChange={(amount) => update(index, { amount })}
              decimals={getCurrency(currency).decimals}
            />
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor={`${idPrefix}-fee-payer-${index}`}>
                Charged by
              </Label>
              <Select
                value={fee.payer}
                onValueChange={(payer) =>
                  update(index, { payer: payer as FeePayer })
                }
              >
                <SelectTrigger
                  id={`${idPrefix}-fee-payer-${index}`}
                  className="bg-surface-2 h-9 border-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="origin">Origin account</SelectItem>
                  <SelectItem value="destination">
                    Destination account
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fees.length > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove fee"
                onClick={() => onChange(fees.filter((_, i) => i !== index))}
              >
                <XIcon />
              </Button>
            )}
          </div>
        );
      })}
      {fees.length < MAX_TRANSFER_FEES && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() =>
            onChange([...fees, { amount: "", payer: "destination" }])
          }
        >
          <PlusIcon />
          Add fee
        </Button>
      )}
    </div>
  );
}
