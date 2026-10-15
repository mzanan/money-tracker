"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { markPairAsTransfer } from "@/lib/actions/transfers";
import { parseAmountInput, roundToScale, toInputDigits } from "@/lib/currency";
import {
  aggregateFeesBySide,
  pairFeeTarget,
  pairIncomeExceedsExpense,
  parseFeeDrafts,
} from "@/lib/transfer";

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
  const delta = pairFeeTarget(expenseTx, incomeTx);

  const [fees, setFees] = useState<FeeDraft[]>([
    {
      amount: toInputDigits(delta, expenseTx.currency),
      payer: "origin",
    },
  ]);

  const feeEntries = parseFeeDrafts(fees, parseAmountInput);

  const bySide = aggregateFeesBySide(
    feeEntries,
    expenseTx.currency,
    incomeTx.currency,
  );

  const total = roundToScale(
    bySide.origin + bySide.destination,
    expenseTx.currency,
  );
  const deltaMismatch = sameCurrency && total > 0 && total !== delta;
  const incomeExceeds = pairIncomeExceedsExpense(expenseTx, incomeTx);

  function submit() {
    if (deltaMismatch || incomeExceeds) return;
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
    incomeExceeds,
    pending,
    submit,
  };
}
