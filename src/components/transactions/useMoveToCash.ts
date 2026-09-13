"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { moveWithdrawalToCash } from "@/lib/actions/cash";
import { parseAmountInput } from "@/lib/currency";
import { cashFromWithdrawalNote } from "@/lib/withdrawal";

export function useMoveToCash({
  txId,
  txNote,
  onOpenChange,
}: {
  txId: string;
  txNote: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const settings = useSettings();
  const { run, pending } = useServerAction();
  const prefill = cashFromWithdrawalNote(txNote);
  const prefilledCurrency = prefill?.currency ?? settings.currencies[0];
  const currencies = settings.currencies.includes(prefilledCurrency)
    ? settings.currencies
    : [prefilledCurrency, ...settings.currencies];

  const [amount, setAmount] = useState(prefill ? String(prefill.amount) : "");
  const [currency, setCurrency] = useState(prefilledCurrency);

  function submit() {
    const parsedAmount = parseAmountInput(amount);
    if (parsedAmount === null) {
      toast.error("Enter an amount");
      return;
    }
    run(
      () =>
        moveWithdrawalToCash({
          id: txId,
          cashAmount: parsedAmount,
          cashCurrency: currency,
        }),
      {
        success: "Moved to Cash",
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return {
    currencies,
    amount,
    setAmount,
    currency,
    setCurrency,
    pending,
    submit,
  };
}
