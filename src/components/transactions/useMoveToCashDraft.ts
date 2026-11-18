"use client";

import { useState } from "react";

import { useSettings } from "@/hooks/useSettings";
import { parseAmountInput, toInputDigits } from "@/lib/currency";
import { cashFromWithdrawalNote } from "@/lib/withdrawal";

export function useMoveToCashDraft(note: string | null) {
  const settings = useSettings();
  const [prefill] = useState(() => cashFromWithdrawalNote(note));
  const prefilledCurrency = prefill?.currency ?? settings.currencies[0];
  const currencies = settings.currencies.includes(prefilledCurrency)
    ? settings.currencies
    : [prefilledCurrency, ...settings.currencies];

  const [amount, setAmount] = useState(
    prefill ? toInputDigits(prefill.amount, prefilledCurrency) : "",
  );
  const [currency, setCurrency] = useState(prefilledCurrency);

  return {
    currencies,
    amount,
    setAmount,
    currency,
    setCurrency,
    parsedAmount: parseAmountInput(amount),
  };
}
