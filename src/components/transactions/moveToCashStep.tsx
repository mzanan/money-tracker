"use client";

import { Loader2Icon } from "lucide-react";

import { AmountCurrencyField } from "@/components/ui/amountCurrencyField";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/ui/stepShell";

import { MOVE_TO_CASH_COPY } from "./moveToCashCopy";
import { useMoveToCash } from "./useMoveToCash";

export function MoveToCashStep({
  txId,
  txNote,
  onBack,
}: {
  txId: string;
  txNote: string | null;
  onBack: () => void;
}) {
  const {
    currencies,
    amount,
    setAmount,
    currency,
    setCurrency,
    pending,
    submit,
  } = useMoveToCash({
    txId,
    txNote,
    onOpenChange: (open) => {
      if (!open) onBack();
    },
  });

  return (
    <StepShell
      title={MOVE_TO_CASH_COPY.title}
      description={MOVE_TO_CASH_COPY.description}
      onBack={onBack}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={submit}>
            {pending && <Loader2Icon className="animate-spin" />}
            {MOVE_TO_CASH_COPY.submitLabel}
          </Button>
        </>
      }
    >
      <AmountCurrencyField
        id="move-to-cash-step"
        label={MOVE_TO_CASH_COPY.amountLabel}
        value={amount}
        onChange={setAmount}
        currency={currency}
        onCurrencyChange={setCurrency}
        currencies={currencies}
        currencyAriaLabel={MOVE_TO_CASH_COPY.currencyAriaLabel}
      />
    </StepShell>
  );
}
