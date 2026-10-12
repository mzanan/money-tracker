"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { markPairAsTransfer } from "@/lib/actions/transfers";
import { parseAmountInput, roundForCurrency } from "@/lib/currency";
import { aggregateFeesBySide, parseFeeDrafts } from "@/lib/transfer";

import type { FeeDraft } from "./transferFeeFields";
import type { RowFacts } from "@/types/ledger";

export function useMarkPairTransferDialog({
  expenseTx,
  incomeTx,
  onSuccess,
}: {
  expenseTx: RowFacts;
  incomeTx: RowFacts;
  onSuccess: () => void;
}) {
  const { run, pending } = useServerAction();

  const sameCurrency = expenseTx.currency === incomeTx.currency;
  const rawDelta = expenseTx.amount - incomeTx.amount;
  const delta =
    sameCurrency && rawDelta > 0
      ? roundForCurrency(rawDelta, expenseTx.currency)
      : 0;

  const [fees, setFees] = useState<FeeDraft[]>([
    { amount: delta > 0 ? String(delta) : "", payer: "origin" },
  ]);

  const feeEntries = parseFeeDrafts(fees, parseAmountInput);

  const bySide = aggregateFeesBySide(
    feeEntries,
    expenseTx.currency,
    incomeTx.currency,
  );

  const total = roundForCurrency(
    bySide.origin + bySide.destination,
    expenseTx.currency,
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
