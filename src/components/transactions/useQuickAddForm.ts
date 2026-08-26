"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getCurrency } from "@/lib/constants/currencies";
import {
  transferAvailableFor,
  withdrawalAvailableFor,
} from "@/lib/constants/sources";
import { useRates } from "@/hooks/useRates";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { recordWithdrawalExpense } from "@/lib/actions/cash";
import { recordTransfer } from "@/lib/actions/transfers";
import { createTransaction } from "@/lib/actions/transactions";
import {
  convert,
  formatMoney,
  parseAmountInput,
  parseAndRoundAmount,
  roundForCurrency,
} from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { withdrawalChargedAmount } from "@/lib/withdrawal";
import {
  aggregateFeesBySide,
  creditedPreview,
  parseFeeDrafts,
} from "@/lib/transfer";

import { useAccountOptions } from "./useAccountOptions";
import { useUiStore } from "@/stores/uiStore";

import { quickAddExtrasLabel } from "./quickAddExtras";

import type { FeeDraft } from "./transferFeeFields";
import type { Kind } from "./kindToggle";

export function useQuickAddForm(source: string) {
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
  const [transfer, setTransfer] = useState(false);
  const [transferDestination, setTransferDestination] = useState("");
  const [transferFees, setTransferFees] = useState<FeeDraft[]>([
    { amount: "", payer: "origin" },
  ]);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedCurrencyState, setReceivedCurrencyState] = useState("");
  const [withdrawalTotal, setWithdrawalTotal] = useState("");
  const [withdrawalFee, setWithdrawalFee] = useState("");
  const [chargedCurrencyState, setChargedCurrencyState] = useState(
    settings.currencies[0],
  );
  const [lastSource, setLastSource] = useState(source);

  if (source !== lastSource) {
    setLastSource(source);
    setWithdrawal(false);
    setWithdrawalTotal("");
    setWithdrawalFee("");
    setChargedCurrencyState(settings.currencies[0]);
    setTransfer(false);
    setTransferDestination("");
    setTransferFees([{ amount: "", payer: "origin" }]);
    setReceivedAmount("");
    setReceivedCurrencyState("");
  }

  const currency = settings.currencies.includes(currencyState)
    ? currencyState
    : settings.currencies[0];

  const chargedCurrency = settings.currencies.includes(chargedCurrencyState)
    ? chargedCurrencyState
    : settings.currencies[0];

  const numericAmount = parseAmountInput(amount);

  const transferAvailable =
    kind === "expense" &&
    transferAvailableFor(source, settings.cash_enabled);
  const transferActive = transfer && transferAvailable;
  const withdrawalAvailable =
    kind === "expense" &&
    withdrawalAvailableFor(source) &&
    !transferActive;
  const withdrawalActive = withdrawal && withdrawalAvailable;
  const extrasLabel = quickAddExtrasLabel(transferAvailable, withdrawalAvailable);
  const withdrawalTotalFilled = parseAmountInput(withdrawalTotal) !== null;

  function setChargedCurrency(value: string) {
    setChargedCurrencyState(value);
    setWithdrawalTotal("");
    setWithdrawalFee("");
  }

  const transferSources = useAccountOptions(source, transferActive);
  const receivedCurrency = settings.currencies.includes(receivedCurrencyState)
    ? receivedCurrencyState
    : currency;
  const parsedReceived = parseAmountInput(receivedAmount);
  const received =
    parsedReceived !== null && receivedCurrency !== currency
      ? { amount: parsedReceived, currency: receivedCurrency }
      : null;
  const destinationCurrency = received?.currency ?? currency;
  const transferFeeEntries = parseFeeDrafts(transferFees, parseAmountInput);
  const transferFeesBySide = aggregateFeesBySide(
    transferFeeEntries,
    currency,
    destinationCurrency,
  );
  const transferPreview =
    numericAmount === null
      ? null
      : creditedPreview({
          debited: numericAmount,
          fees: transferFeesBySide,
          sourceCurrency: currency,
          destinationCurrency,
          received,
          rates: ratesQuery.data?.rates ?? null,
        });

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

    if (transferActive) {
      if (!transferDestination) {
        toast.error("Pick the destination account");
        return;
      }
      run(
        () =>
          recordTransfer({
            amount: rounded,
            currency,
            source,
            destinationSource: transferDestination,
            occurredOn: date,
            note: description.trim() || null,
            tags: tagsInput
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            fees: transferFeeEntries,
            ...(received ? { received } : {}),
          }),
        {
          success: `Transfer · ${formatMoney(rounded, currency)}`,
          onSuccess: () => {
            setAmount("");
            setDescription("");
            setTagsInput("");
            setTransfer(false);
            setTransferDestination("");
            setTransferFees([{ amount: "", payer: "origin" }]);
            setReceivedAmount("");
            setReceivedCurrencyState("");
            setLastCurrency(currency);
          },
        },
      );
      return;
    }

    if (withdrawalActive) {
      const total = parseAmountInput(withdrawalTotal);
      if (total === null) {
        toast.error("Enter the total charged");
        return;
      }
      const fee = parseAmountInput(withdrawalFee) ?? undefined;
      const booked = withdrawalChargedAmount({
        received: rounded,
        receivedCurrency: currency,
        chargedCurrency,
        total,
        fee,
      });
      if (booked === null) {
        toast.error("Charged amount must be greater than the fee");
        return;
      }
      run(
        () =>
          recordWithdrawalExpense({
            cashAmount: rounded,
            cashCurrency: currency,
            chargedCurrency,
            total,
            fee,
            source,
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
    extrasLabel,
    transfer,
    setTransfer,
    transferAvailable,
    transferActive,
    transferSources,
    transferDestination,
    setTransferDestination,
    transferFees,
    setTransferFees,
    receivedAmount,
    setReceivedAmount,
    receivedCurrency,
    setReceivedCurrency: setReceivedCurrencyState,
    destinationCurrency,
    transferPreview,
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
