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
  const [currency, setCurrency] = useState(settings.currencies[0]);
  const [source, setSource] = useState(sources[0] ?? "");
  const [date, setDate] = useState(() => todayInTz(timezone));

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
    run(
      () =>
        recordCashWithdrawal({
          amount: parsed,
          currency,
          source,
          occurredOn: date,
        }),
      {
        success: "Withdrawal recorded",
        onSuccess: () => setAmount(""),
      },
    );
  }

  return {
    currencies: settings.currencies,
    amount,
    setAmount,
    currency,
    setCurrency,
    source,
    setSource,
    date,
    setDate,
    pending,
    handleSubmit,
  };
}
