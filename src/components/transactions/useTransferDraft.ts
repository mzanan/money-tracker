"use client";

import { useState } from "react";

import { useAccountOptions } from "./useAccountOptions";
import { useAccountCurrencies } from "@/hooks/useAccountCurrencies";
import { useSettings } from "@/hooks/useSettings";
import {
  accountAccepts,
  preferredAccountCurrency,
} from "@/lib/accountCurrencies";
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
  const accountCurrencies = useAccountCurrencies();
  const settings = useSettings();
  const [selected, setSelectedState] = useState("");
  const [fees, setFees] = useState<FeeDraft[]>(EMPTY_FEES);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedCurrency, setReceivedCurrency] = useState(txCurrency);

  const receivedRequired = !accountAccepts(
    accountCurrencies[selected],
    txCurrency,
  );

  function setSelected(next: string) {
    setSelectedState(next);
    const allowed = accountCurrencies[next];
    setReceivedCurrency(
      accountAccepts(allowed, txCurrency)
        ? txCurrency
        : (preferredAccountCurrency(allowed, settings.currencies) ??
            txCurrency),
    );
  }

  function reset() {
    setSelectedState("");
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
    receivedRequired,
    bySide,
    preview,
    reset,
  };
}
