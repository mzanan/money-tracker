"use client";

import { useState } from "react";

import { useAccountCurrencies } from "@/hooks/useAccountCurrencies";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { preferredAccountCurrency } from "@/lib/accountCurrencies";
import { creditTransfer } from "@/lib/actions/transferCredit";
import { parseAmountInput } from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import type { PendingTransfer } from "@/lib/ledger/movements";
import {
  clampCreditDate,
  creditCurrencies,
  creditReceivedDefault,
} from "@/lib/transfer";

export function useCreditTransfer({
  transfer,
  onDone,
}: {
  transfer: PendingTransfer;
  onDone: () => void;
}) {
  const settings = useSettings();
  const timezone = useTimezone();
  const accountCurrencies = useAccountCurrencies();
  const { run, pending } = useServerAction();
  const defaultCurrency =
    preferredAccountCurrency(
      accountCurrencies[transfer.to],
      settings.currencies,
      transfer.currency,
    ) ?? transfer.currency;
  const today = todayInTz(timezone);
  const [creditedOn, setCreditedOn] = useState(
    clampCreditDate(today, transfer.sentOn),
  );
  const [receivedCurrency, setReceivedCurrencyState] =
    useState(defaultCurrency);
  const [receivedAmount, setReceivedAmountState] = useState(() =>
    creditReceivedDefault(transfer, defaultCurrency, 0),
  );
  const [receivedTouched, setReceivedTouched] = useState(false);
  const [fee, setFeeState] = useState("");

  const amount = parseAmountInput(receivedAmount);
  const feeAmount = parseAmountInput(fee) ?? 0;

  function setReceivedAmount(next: string) {
    setReceivedTouched(true);
    setReceivedAmountState(next);
  }

  function setReceivedCurrency(next: string) {
    setReceivedCurrencyState(next);
    setReceivedTouched(false);
    setReceivedAmountState(creditReceivedDefault(transfer, next, feeAmount));
  }

  function setFee(next: string) {
    setFeeState(next);
    if (!receivedTouched) {
      setReceivedAmountState(
        creditReceivedDefault(
          transfer,
          receivedCurrency,
          parseAmountInput(next) ?? 0,
        ),
      );
    }
  }

  const currencies = creditCurrencies(transfer.currency, settings.currencies);

  function submit() {
    if (amount === null || amount <= 0) return;
    run(
      () =>
        creditTransfer(transfer.id, {
          creditedOn,
          received: { amount, currency: receivedCurrency },
          destinationFee: feeAmount,
        }),
      { success: "Marked as credited", onSuccess: onDone },
    );
  }

  return {
    creditedOn,
    setCreditedOn,
    receivedAmount,
    setReceivedAmount,
    receivedCurrency,
    setReceivedCurrency,
    fee,
    setFee,
    currencies,
    canSubmit: amount !== null && amount > 0 && !pending,
    pending,
    submit,
  };
}
