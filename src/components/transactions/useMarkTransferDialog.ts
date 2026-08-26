"use client";

import { useState } from "react";

import { useAccountOptions } from "./useAccountOptions";
import { useRates } from "@/hooks/useRates";
import { useServerAction } from "@/hooks/useServerAction";
import { markAsTransfer } from "@/lib/actions/transfers";
import { parseAmountInput } from "@/lib/currency";
import {
  aggregateFeesBySide,
  creditedPreview,
  parseFeeDrafts,
} from "@/lib/transfer";

import type { FeeDraft } from "./transferFeeFields";

const EMPTY_FEES: FeeDraft[] = [{ amount: "", payer: "origin" }];

export function useMarkTransferDialog({
  txId,
  txSource,
  txCurrency,
  txAmount,
  open,
  onOpenChange,
}: {
  txId: string;
  txSource: string;
  txCurrency: string;
  txAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: ratesData } = useRates();
  const { run, pending } = useServerAction();
  const [selected, setSelected] = useState("");
  const [fees, setFees] = useState<FeeDraft[]>(EMPTY_FEES);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedCurrency, setReceivedCurrency] = useState(txCurrency);
  const sources = useAccountOptions(txSource, open, () => {
    setSelected("");
    setFees(EMPTY_FEES);
    setReceivedAmount("");
    setReceivedCurrency(txCurrency);
  });

  const parsedReceived = parseAmountInput(receivedAmount);
  const received =
    parsedReceived !== null && receivedCurrency !== txCurrency
      ? { amount: parsedReceived, currency: receivedCurrency }
      : null;
  const destinationCurrency = received?.currency ?? txCurrency;

  const feeEntries = parseFeeDrafts(fees, parseAmountInput);

  const bySide = aggregateFeesBySide(
    feeEntries,
    txCurrency,
    destinationCurrency,
  );
  const preview = creditedPreview({
    debited: txAmount,
    fees: bySide,
    sourceCurrency: txCurrency,
    destinationCurrency,
    received,
    rates: ratesData?.rates ?? null,
  });

  function submit() {
    if (!selected) return;
    run(
      () =>
        markAsTransfer(txId, selected, {
          fees: bySide,
          ...(received ? { received } : {}),
        }),
      {
        success: "Marked as a transfer",
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return {
    sources,
    selected,
    setSelected,
    fees,
    setFees,
    receivedAmount,
    setReceivedAmount,
    receivedCurrency,
    setReceivedCurrency,
    destinationCurrency,
    preview,
    pending,
    submit,
  };
}
