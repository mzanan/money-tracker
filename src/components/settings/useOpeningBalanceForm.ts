"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { acceptedCurrencies, currencyOptions } from "@/lib/accountCurrencies";
import { setOpeningBalance } from "@/lib/actions/openingBalance";
import { parseAmountInput } from "@/lib/currency";
import { openingFields, type OpeningBalance } from "@/lib/openingBalance";

export function useOpeningBalanceForm({
  source,
  declared,
  openings,
  onDone,
}: {
  source: string;
  declared: string[];
  openings: Record<string, OpeningBalance> | undefined;
  onDone: () => void;
}) {
  const settings = useSettings();
  const { run, pending } = useServerAction();
  const currencies = acceptedCurrencies(
    declared,
    currencyOptions(settings.currencies, declared),
  );
  const [currency, setCurrency] = useState(
    currencies.find((code) => openings?.[code]) ?? currencies[0] ?? "",
  );
  const [amount, setAmount] = useState(
    () => openingFields(openings, currency).amount,
  );
  const [occurredOn, setOccurredOn] = useState(
    () => openingFields(openings, currency).occurredOn,
  );

  function changeCurrency(next: string) {
    const fields = openingFields(openings, next);
    setCurrency(next);
    setAmount(fields.amount);
    setOccurredOn(fields.occurredOn);
  }

  function submit() {
    const value = parseAmountInput(amount);
    if (value === null || value <= 0) {
      toast.error("Enter an amount");
      return;
    }
    run(
      () =>
        setOpeningBalance({
          source,
          currency,
          amount: value,
          occurredOn: occurredOn || null,
        }),
      { success: "Opening balance saved", onSuccess: onDone },
    );
  }

  return {
    currencies,
    amount,
    setAmount,
    currency,
    setCurrency: changeCurrency,
    occurredOn,
    setOccurredOn,
    pending,
    submit,
  };
}
