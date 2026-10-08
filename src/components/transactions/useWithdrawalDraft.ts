"use client";

import { useState } from "react";

import { parseAmountInput } from "@/lib/currency";

export function useWithdrawalDraft({
  currencies,
  preferred,
}: {
  currencies: string[];
  preferred?: string | null;
}) {
  const defaultCharged = preferred ?? currencies[0];
  const [total, setTotal] = useState("");
  const [fee, setFee] = useState("");
  const [chargedCurrencyState, setChargedCurrencyState] =
    useState(defaultCharged);

  function setChargedCurrency(value: string) {
    setChargedCurrencyState(value);
    setTotal("");
    setFee("");
  }

  function reset() {
    setTotal("");
    setFee("");
    setChargedCurrencyState(defaultCharged);
  }

  const chargedCurrency = currencies.includes(chargedCurrencyState)
    ? chargedCurrencyState
    : currencies[0];

  const totalFilled = parseAmountInput(total) !== null;

  return {
    total,
    setTotal,
    fee,
    setFee,
    chargedCurrency,
    setChargedCurrency,
    totalFilled,
    reset,
  };
}
