"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { markPairAsTransfer } from "@/lib/actions/transfers";
import { parseAmountInput, roundForCurrency } from "@/lib/currency";
import type { Transaction } from "@/types/db";

export function useMarkPairTransferDialog({
  expenseTx,
  incomeTx,
  onSuccess,
}: {
  expenseTx: Transaction;
  incomeTx: Transaction;
  onSuccess: () => void;
}) {
  const { run, pending } = useServerAction();
  const [recordFeeDelta, setRecordFeeDelta] = useState(true);
  const [feeAmount, setFeeAmount] = useState("");

  const sameCurrency =
    expenseTx.currency_original === incomeTx.currency_original;
  const rawDelta = expenseTx.amount_original - incomeTx.amount_original;
  const delta =
    sameCurrency && rawDelta > 0
      ? roundForCurrency(rawDelta, expenseTx.currency_original)
      : 0;

  function submit() {
    run(
      () =>
        markPairAsTransfer(
          expenseTx.id,
          incomeTx.id,
          sameCurrency
            ? { recordFeeDelta: delta > 0 && recordFeeDelta }
            : { feeAmount: parseAmountInput(feeAmount) ?? undefined },
        ),
      {
        success: "Marked as a transfer",
        onSuccess,
      },
    );
  }

  return {
    sameCurrency,
    delta,
    recordFeeDelta,
    setRecordFeeDelta,
    feeAmount,
    setFeeAmount,
    pending,
    submit,
  };
}
