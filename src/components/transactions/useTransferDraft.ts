"use client";

import { useState } from "react";

import { useAccountOptions } from "./useAccountOptions";
import { useRates } from "@/hooks/useRates";
import { parseAmountInput } from "@/lib/currency";
import {
  aggregateFeesBySide,
  creditedPreview,
  parseFeeDrafts,
} from "@/lib/transfer";

import type { FeeDraft } from "./transferFeeFields";

const EMPTY_FEES: FeeDraft[] = [{ amount: "", payer: "origin" }];

export function useTransferDraft({
  txSource,
  txCurrency,
  txAmount,
  active,
}: {
  txSource: string;
  txCurrency: string;
  txAmount: number;
  active: boolean;
}) {
  const { data: ratesData } = useRates();
  const [selected, setSelected] = useState("");
  const [fees, setFees] = useState<FeeDraft[]>(EMPTY_FEES);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedCurrency, setReceivedCurrency] = useState(txCurrency);

  function reset() {
    setSelected("");
    setFees(EMPTY_FEES);
    setReceivedAmount("");
    setReceivedCurrency(txCurrency);
  }

  const sources = useAccountOptions(txSource, active, reset);

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
    received,
    bySide,
    preview,
    reset,
  };
}
