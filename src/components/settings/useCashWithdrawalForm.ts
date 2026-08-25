"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { recordCashWithdrawal } from "@/lib/actions/cash";
import { parseAmountInput } from "@/lib/currency";
import { todayInTz } from "@/lib/dates";

export function useCashWithdrawalForm(sources: string[]) {
  const settings = useSettings();
  const timezone = useTimezone();
  const { run, pending } = useServerAction();

  const [amount, setAmount] = useState("");
  const [currency, setCurrencyState] = useState(settings.currencies[0]);
  const [chargedCurrency, setChargedCurrencyState] = useState(
    settings.currencies[0],
  );
  const [total, setTotal] = useState("");
  const [fee, setFee] = useState("");
  const [source, setSource] = useState(sources[0] ?? "");
  const [date, setDate] = useState(() => todayInTz(timezone));

  const needsCharge = chargedCurrency !== currency;
  const totalFilled = total.trim() !== "";

  function setCurrency(value: string) {
    setCurrencyState(value);
    setTotal("");
  }

  function setChargedCurrency(value: string) {
    setChargedCurrencyState(value);
    setTotal("");
    setFee("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmountInput(amount);
    if (parsed === null) {
      toast.error("Enter an amount");
      return;
    }
    if (!source) {
      toast.error("Pick an account");
      return;
    }
    if (needsCharge && !totalFilled) {
      toast.error("Enter the total charged");
      return;
    }
    const parsedTotal = totalFilled ? parseAmountInput(total) : null;
    const parsedFee = fee.trim() !== "" ? parseAmountInput(fee) : null;
    run(
      () =>
        recordCashWithdrawal({
          amount: parsed,
          currency,
          source,
          occurredOn: date,
          chargedCurrency,
          total: parsedTotal ?? undefined,
          fee: parsedFee ?? undefined,
        }),
      {
        success: "Withdrawal recorded",
        onSuccess: () => {
          setAmount("");
          setTotal("");
          setFee("");
        },
      },
    );
  }

  return {
    currencies: settings.currencies,
    amount,
    setAmount,
    currency,
    setCurrency,
    chargedCurrency,
    setChargedCurrency,
    total,
    setTotal,
    fee,
    setFee,
    source,
    setSource,
    date,
    setDate,
    pending,
    handleSubmit,
  };
}
