"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { recordCashExchange } from "@/lib/actions/cash";
import { todayInTz } from "@/lib/dates";

function parseAmount(value: string): number | null {
  const num = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function useCashExchangeForm() {
  const settings = useSettings();
  const timezone = useTimezone();
  const { run, pending } = useServerAction();

  const [outAmount, setOutAmount] = useState("");
  const [outCurrency, setOutCurrency] = useState(settings.currencies[0]);
  const [inAmount, setInAmount] = useState("");
  const [inCurrency, setInCurrency] = useState(
    settings.currencies[1] ?? settings.currencies[0],
  );
  const [date, setDate] = useState(() => todayInTz(timezone));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const out = parseAmount(outAmount);
    const incoming = parseAmount(inAmount);
    if (out === null || incoming === null) {
      toast.error("Enter both amounts");
      return;
    }
    run(
      () =>
        recordCashExchange({
          outAmount: out,
          outCurrency,
          inAmount: incoming,
          inCurrency,
          occurredOn: date,
        }),
      {
        success: `Exchanged ${outCurrency} → ${inCurrency}`,
        onSuccess: () => {
          setOutAmount("");
          setInAmount("");
        },
      },
    );
  }

  return {
    currencies: settings.currencies,
    outAmount,
    setOutAmount,
    outCurrency,
    setOutCurrency,
    inAmount,
    setInAmount,
    inCurrency,
    setInCurrency,
    date,
    setDate,
    pending,
    handleSubmit,
  };
}
