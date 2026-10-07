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
import { parseFeeDrafts } from "@/lib/transfer";

import { useTransferDraft } from "./useTransferDraft";
import { useWithdrawalDraft } from "./useWithdrawalDraft";
import { useUiStore } from "@/stores/uiStore";

import { quickAddExtrasLabel } from "./quickAddExtras";

import type { Kind } from "./kindToggle";

export function useQuickAddForm(source: string, onAdded?: () => void) {
  const settings = useSettings();
  const timezone = useTimezone();
  const ratesQuery = useRates();
  const { run, pending } = useServerAction();
  const tagsId = useId();
  const formId = useId();

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
  const [fee, setFee] = useState("");
  const [date, setDate] = useState(() => todayInTz(timezone));
  const [showExtras, setShowExtras] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [lastSource, setLastSource] = useState(source);

  const currency = settings.currencies.includes(currencyState)
    ? currencyState
    : settings.currencies[0];

  const numericAmount = parseAmountInput(amount);

  const transferAvailable =
    kind === "expense" && transferAvailableFor(source, settings.cash_enabled);
  const transferActive = transfer && transferAvailable;
  const withdrawalAvailable =
    kind === "expense" && withdrawalAvailableFor(source) && !transferActive;
  const withdrawalActive = withdrawal && withdrawalAvailable;
  const extrasLabel = quickAddExtrasLabel(
    transferAvailable,
    withdrawalAvailable,
  );

  const transferDraft = useTransferDraft({
    txSource: source,
    txCurrency: currency,
    txAmount: numericAmount ?? 0,
    active: transferActive,
  });
  const withdrawalDraft = useWithdrawalDraft({
    currencies: settings.currencies,
  });

  if (source !== lastSource) {
    setLastSource(source);
    setWithdrawal(false);
    withdrawalDraft.reset();
    setTransfer(false);
    transferDraft.reset();
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

    if (transferActive) {
      if (!transferDraft.selected) {
        toast.error("Pick the destination account");
        return;
      }
      const transferFeeEntries = parseFeeDrafts(
        transferDraft.fees,
        parseAmountInput,
      );
      run(
        () =>
          recordTransfer({
            amount: rounded,
            currency,
            source,
            destinationSource: transferDraft.selected,
            occurredOn: date,
            note: description.trim() || null,
            tags: tagsInput
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            fees: transferFeeEntries,
            ...(transferDraft.received
              ? { received: transferDraft.received }
              : {}),
          }),
        {
          success: `Transfer · ${formatMoney(rounded, currency)}`,
          onSuccess: () => {
            setAmount("");
            setDescription("");
            setTagsInput("");
            setFee("");
            setTransfer(false);
            transferDraft.reset();
            setLastCurrency(currency);
            onAdded?.();
          },
        },
      );
      return;
    }

    if (withdrawalActive) {
      const total = parseAmountInput(withdrawalDraft.total);
      if (total === null) {
        toast.error("Enter the total charged");
        return;
      }
      const fee = parseAmountInput(withdrawalDraft.fee) ?? undefined;
      const booked = withdrawalChargedAmount({
        received: rounded,
        receivedCurrency: currency,
        chargedCurrency: withdrawalDraft.chargedCurrency,
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
            chargedCurrency: withdrawalDraft.chargedCurrency,
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
          success: `Withdrawal · ${formatMoney(booked, withdrawalDraft.chargedCurrency)}`,
          onSuccess: () => {
            setAmount("");
            setDescription("");
            setTagsInput("");
            setFee("");
            withdrawalDraft.reset();
            setWithdrawal(false);
            setLastCurrency(currency);
            onAdded?.();
          },
        },
      );
      return;
    }

    const feeAmount = fee.trim() ? parseAmountInput(fee) : null;
    if (fee.trim() && feeAmount === null) {
      toast.error("Enter a valid fee");
      return;
    }
    const roundedFee =
      feeAmount === null ? undefined : roundForCurrency(feeAmount, currency);

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
          fee: roundedFee,
        }),
      {
        success:
          `${kind === "income" ? "Income" : "Expense"} · ${formatMoney(rounded, currency)}` +
          (roundedFee ? ` · fee ${formatMoney(roundedFee, currency)}` : ""),
        onSuccess: () => {
          setAmount("");
          setDescription("");
          setTagsInput("");
          setFee("");
          setLastCurrency(currency);
          onAdded?.();
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
    transferSources: transferDraft.sources,
    transferDestination: transferDraft.selected,
    setTransferDestination: transferDraft.setSelected,
    transferFees: transferDraft.fees,
    setTransferFees: transferDraft.setFees,
    receivedAmount: transferDraft.receivedAmount,
    setReceivedAmount: transferDraft.setReceivedAmount,
    receivedCurrency: transferDraft.receivedCurrency,
    setReceivedCurrency: transferDraft.setReceivedCurrency,
    destinationCurrency: transferDraft.destinationCurrency,
    transferPreview: transferDraft.preview,
    withdrawal,
    setWithdrawal,
    withdrawalAvailable,
    withdrawalActive,
    withdrawalTotal: withdrawalDraft.total,
    setWithdrawalTotal: withdrawalDraft.setTotal,
    withdrawalFee: withdrawalDraft.fee,
    setWithdrawalFee: withdrawalDraft.setFee,
    withdrawalTotalFilled: withdrawalDraft.totalFilled,
    chargedCurrency: withdrawalDraft.chargedCurrency,
    setChargedCurrency: withdrawalDraft.setChargedCurrency,
    description,
    setDescription,
    tagsId,
    formId,
    tagsInput,
    setTagsInput,
    fee,
    setFee,
    feeAvailable: !transferActive && !withdrawalActive,
    date,
    setDate,
    pending,
    handleSubmit,
  };
}
