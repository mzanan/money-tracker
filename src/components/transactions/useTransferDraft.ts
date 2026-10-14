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
  clampCreditDate,
  parseFeeDrafts,
} from "@/lib/transfer";

import type { FeeDraft } from "./transferFeeFields";

const EMPTY_FEES: FeeDraft[] = [{ amount: "", payer: "origin" }];

export function useTransferDraft({
  txSource,
  txCurrency,
  txAmount,
  sentOn,
  active,
  pendingAllowed = true,
}: {
  txSource: string;
  txCurrency: string;
  txAmount: number;
  sentOn: string;
  active: boolean;
  pendingAllowed?: boolean;
}) {
  const { data: ratesData } = useRates();
  const accountCurrencies = useAccountCurrencies();
  const settings = useSettings();
  const [selected, setSelectedState] = useState("");
  const [allFees, setAllFees] = useState<FeeDraft[]>(EMPTY_FEES);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedCurrency, setReceivedCurrency] = useState(txCurrency);
  const [notReceivedChoice, setNotReceivedChoice] = useState(false);
  const [creditedOverride, setCreditedOn] = useState<string | null>(null);
  const notReceived = notReceivedChoice && pendingAllowed;
  const creditedOn = clampCreditDate(creditedOverride ?? sentOn, sentOn);
  const receivedOn = notReceived ? null : creditedOn;

  const originFees = allFees.filter((fee) => fee.payer === "origin");
  const fees = notReceived
    ? originFees.length > 0
      ? originFees
      : EMPTY_FEES
    : allFees;

  function setFees(next: FeeDraft[]) {
    setAllFees(
      notReceived
        ? [...next, ...allFees.filter((fee) => fee.payer !== "origin")]
        : next,
    );
  }

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

  function resetDestination() {
    setSelectedState("");
    setAllFees(EMPTY_FEES);
    setReceivedAmount("");
    setReceivedCurrency(txCurrency);
  }

  function reset() {
    resetDestination();
    setNotReceivedChoice(false);
    setCreditedOn(null);
  }

  const sources = useAccountOptions(txSource, active, resetDestination);

  const parsedReceived = parseAmountInput(receivedAmount);
  const received =
    !notReceived && parsedReceived !== null && receivedCurrency !== txCurrency
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
    receivedRequired: receivedRequired && !notReceived,
    notReceived,
    setNotReceived: setNotReceivedChoice,
    creditedOn,
    setCreditedOn,
    receivedOn,
    bySide,
    preview,
    reset,
  };
}
