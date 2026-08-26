"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { markPairAsTransfer } from "@/lib/actions/transfers";
import { parseAmountInput, roundForCurrency } from "@/lib/currency";
import { aggregateFeesBySide, parseFeeDrafts } from "@/lib/transfer";

import type { FeeDraft } from "./transferFeeFields";
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

  const sameCurrency =
    expenseTx.currency_original === incomeTx.currency_original;
  const rawDelta = expenseTx.amount_original - incomeTx.amount_original;
  const delta =
    sameCurrency && rawDelta > 0
      ? roundForCurrency(rawDelta, expenseTx.currency_original)
      : 0;

  const [fees, setFees] = useState<FeeDraft[]>([
    { amount: delta > 0 ? String(delta) : "", payer: "origin" },
  ]);

  const feeEntries = parseFeeDrafts(fees, parseAmountInput);

  const bySide = aggregateFeesBySide(
    feeEntries,
    expenseTx.currency_original,
    incomeTx.currency_original,
  );

  const total = roundForCurrency(
    bySide.origin + bySide.destination,
    expenseTx.currency_original,
  );
  const deltaMismatch = sameCurrency && total > 0 && total !== delta;

  function submit() {
    if (deltaMismatch) return;
    run(() => markPairAsTransfer(expenseTx.id, incomeTx.id, { fees: bySide }), {
      success: "Marked as a transfer",
      onSuccess,
    });
  }

  return {
    sameCurrency,
    delta,
    fees,
    setFees,
    deltaMismatch,
    pending,
    submit,
  };
}
