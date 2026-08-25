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
  const [currency, setCurrencyState] = useState(
    settings.currencies[1] ?? settings.currencies[0],
  );
  const [chargedCurrency, setChargedCurrencyState] = useState(
    settings.currencies[0],
  );
  const [total, setTotal] = useState("");
  const [rate, setRate] = useState("");
  const [fee, setFee] = useState("");
  const [source, setSource] = useState(sources[0] ?? "");
  const [date, setDate] = useState(() => todayInTz(timezone));

  const needsCharge = chargedCurrency !== currency;
  const totalFilled = total.trim() !== "";
  const rateFilled = rate.trim() !== "";

  function setCurrency(value: string) {
    setCurrencyState(value);
    setTotal("");
    setRate("");
  }

  function setChargedCurrency(value: string) {
    setChargedCurrencyState(value);
    setTotal("");
    setRate("");
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
    if (needsCharge && !totalFilled && !rateFilled) {
      toast.error("Enter the total charged or the exchange rate");
      return;
    }
    const parsedTotal = totalFilled ? parseAmountInput(total) : null;
    const parsedRate = rateFilled ? parseAmountInput(rate) : null;
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
          rate: parsedRate ?? undefined,
          fee: parsedFee ?? undefined,
        }),
      {
        success: "Withdrawal recorded",
        onSuccess: () => {
          setAmount("");
          setTotal("");
          setRate("");
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
    rate,
    setRate,
    fee,
    setFee,
    needsCharge,
    totalFilled,
    rateFilled,
    source,
    setSource,
    date,
    setDate,
    pending,
    handleSubmit,
  };
}
