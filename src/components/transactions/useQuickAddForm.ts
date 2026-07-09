"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getCurrency } from "@/config/currencies";
import { useRates } from "@/hooks/useRates";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { createTransaction } from "@/lib/actions/transactions";
import { convert, formatMoney, roundForCurrency } from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { useUiStore } from "@/stores/uiStore";

import type { Kind } from "./kindToggle";

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function useQuickAddForm(source?: string) {
  const settings = useSettings();
  const timezone = useTimezone();
  const ratesQuery = useRates();
  const { run, pending } = useServerAction();
  const tagsId = useId();

  const lastCurrency = useUiStore((state) => state.lastCurrency);
  const setLastCurrency = useUiStore((state) => state.setLastCurrency);

  const initialCurrency =
    lastCurrency && settings.currencies.includes(lastCurrency)
      ? lastCurrency
      : settings.currencies[0];

  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [currencyState, setCurrency] = useState(initialCurrency);
  const [tagsInput, setTagsInput] = useState("");
  const [date, setDate] = useState(() => todayInTz(timezone));
  const [showExtras, setShowExtras] = useState(false);

  const currency = settings.currencies.includes(currencyState)
    ? currencyState
    : settings.currencies[0];

  const numericAmount = parseAmount(amount);

  const preview = useMemo(() => {
    if (numericAmount === null) return null;
    if (currency === settings.base_currency) return null;
    const rates = ratesQuery.data?.rates;
    if (!rates) return null;
    try {
      const converted = convert(
        numericAmount,
        currency,
        settings.base_currency,
        rates,
      );
      const rounded = roundForCurrency(converted, settings.base_currency);
      return formatMoney(rounded, settings.base_currency);
    } catch {
      return null;
    }
  }, [numericAmount, currency, settings.base_currency, ratesQuery.data]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (numericAmount === null) {
      toast.error("Enter an amount");
      return;
    }

    const rounded = roundForCurrency(numericAmount, currency);

    run(
      () =>
        createTransaction({
          kind,
          amount: rounded,
          currency,
          tags: tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          note: null,
          occurredOn: date,
          source,
        }),
      {
        success: `${kind === "income" ? "Income" : "Expense"} · ${formatMoney(rounded, currency)}`,
        onSuccess: () => {
          setAmount("");
          setTagsInput("");
          setLastCurrency(currency);
        },
      },
    );
  }

  const currencyMeta = getCurrency(currency);

  return {
    kind,
    setKind,
    amount,
    setAmount,
    currency,
    setCurrency,
    currencies: settings.currencies,
    currencyMeta,
    numericAmount,
    preview,
    ratesPending: ratesQuery.isPending,
    baseCurrency: settings.base_currency,
    showExtras,
    setShowExtras,
    tagsId,
    tagsInput,
    setTagsInput,
    date,
    setDate,
    pending,
    handleSubmit,
  };
}
