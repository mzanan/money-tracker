"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getCurrency } from "@/lib/constants/currencies";
import { kindOfSource } from "@/lib/constants/sources";
import { useRates } from "@/hooks/useRates";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { recordWithdrawalExpense } from "@/lib/actions/cash";
import { createTransaction } from "@/lib/actions/transactions";
import {
  convert,
  formatMoney,
  parseAmountInput,
  parseAndRoundAmount,
  roundForCurrency,
} from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { useUiStore } from "@/stores/uiStore";

import type { Kind } from "./kindToggle";

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
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [date, setDate] = useState(() => todayInTz(timezone));
  const [showExtras, setShowExtras] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);
  const [withdrawalTotal, setWithdrawalTotal] = useState("");
  const [withdrawalFee, setWithdrawalFee] = useState("");
  const [chargedCurrencyState, setChargedCurrencyState] = useState(
    settings.currencies[0],
  );

  const currency = settings.currencies.includes(currencyState)
    ? currencyState
    : settings.currencies[0];

  const chargedCurrency = settings.currencies.includes(chargedCurrencyState)
    ? chargedCurrencyState
    : settings.currencies[0];

  const numericAmount = parseAmountInput(amount);

  const withdrawalAvailable =
    kind === "expense" &&
    source !== undefined &&
    kindOfSource(source) === "csv";
  const withdrawalActive = withdrawal && withdrawalAvailable;
  const withdrawalTotalFilled = parseAmountInput(withdrawalTotal) !== null;

  function setChargedCurrency(value: string) {
    setChargedCurrencyState(value);
    setWithdrawalTotal("");
    setWithdrawalFee("");
  }

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
    const parsed = parseAndRoundAmount(amount, currency);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    const rounded = parsed.amount;

    if (withdrawalActive) {
      const total = parseAmountInput(withdrawalTotal);
      if (total === null) {
        toast.error("Enter the total charged");
        return;
      }
      const fee = parseAmountInput(withdrawalFee) ?? undefined;
      const booked = roundForCurrency(total - (fee ?? 0), chargedCurrency);
      run(
        () =>
          recordWithdrawalExpense({
            cashAmount: rounded,
            cashCurrency: currency,
            chargedCurrency,
            total,
            fee,
            source: source ?? "",
            occurredOn: date,
            note: description.trim() || null,
            tags: tagsInput
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          }),
        {
          success: `Withdrawal · ${formatMoney(booked, chargedCurrency)}`,
          onSuccess: () => {
            setAmount("");
            setDescription("");
            setTagsInput("");
            setWithdrawalTotal("");
            setWithdrawalFee("");
            setWithdrawal(false);
            setLastCurrency(currency);
          },
        },
      );
      return;
    }

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
          note: description.trim() || null,
          occurredOn: date,
          source,
        }),
      {
        success: `${kind === "income" ? "Income" : "Expense"} · ${formatMoney(rounded, currency)}`,
        onSuccess: () => {
          setAmount("");
          setDescription("");
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
    withdrawal,
    setWithdrawal,
    withdrawalAvailable,
    withdrawalActive,
    withdrawalTotal,
    setWithdrawalTotal,
    withdrawalFee,
    setWithdrawalFee,
    withdrawalTotalFilled,
    chargedCurrency,
    setChargedCurrency,
    description,
    setDescription,
    tagsId,
    tagsInput,
    setTagsInput,
    date,
    setDate,
    pending,
    handleSubmit,
  };
}
