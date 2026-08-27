"use client";

import { useState } from "react";

import { parseAmountInput } from "@/lib/currency";

export function useWithdrawalDraft({ currencies }: { currencies: string[] }) {
  const [total, setTotal] = useState("");
  const [fee, setFee] = useState("");
  const [chargedCurrencyState, setChargedCurrencyState] = useState(
    currencies[0],
  );

  function setChargedCurrency(value: string) {
    setChargedCurrencyState(value);
    setTotal("");
    setFee("");
  }

  function reset() {
    setTotal("");
    setFee("");
    setChargedCurrencyState(currencies[0]);
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
