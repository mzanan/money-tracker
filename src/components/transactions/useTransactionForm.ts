"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useAccountOptions } from "./useAccountOptions";
import { useEntrySuggestions } from "./useEntrySuggestions";
import { useTagPicker } from "./useTagPicker";
import { useTransferDraft } from "./useTransferDraft";
import { useWithdrawalDraft } from "./useWithdrawalDraft";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { convertToWithdrawal } from "@/lib/actions/cash";
import { markAsTransfer } from "@/lib/actions/transfers";
import {
  createTransaction,
  updateTransaction,
} from "@/lib/actions/transactions";
import {
  kindOfSource,
  transferAvailableFor,
  withdrawalAvailableFor,
} from "@/lib/constants/sources";
import { parseAmountInput, parseAndRoundAmount } from "@/lib/currency";
import { EXTERNAL_ID_PREFIX, isWithdrawalExternalId } from "@/lib/externalIds";
import { flowDraftOf, flowEdited } from "@/lib/flowDraft";

import type { Kind } from "./kindToggle";
import { useAccountCurrencies } from "@/hooks/useAccountCurrencies";
import { useEntrySuggestionCatalog } from "@/hooks/useEntrySuggestionCatalog";
import {
  acceptedCurrencies,
  preferredAccountCurrency,
} from "@/lib/accountCurrencies";

export interface TransactionSeed {
  kind: Kind;
  amount: number;
  currency: string;
  source: string;
  note: string | null;
  tags: string[];
  occurredOn: string;
  transferGroup: string | null;
  externalId: string | null;
}

export function useTransactionForm({
  seed,
  txId,
  kindLocked,
  open,
  onOpenChange,
  successMessage,
  onCreated,
}: {
  seed: TransactionSeed;
  txId?: string;
  kindLocked?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  successMessage?: string;
  onCreated?: (id: string) => void;
}) {
  const settings = useSettings();
  const { run, pending } = useServerAction();

  const [seedFlow] = useState(() => flowDraftOf(seed));
  const [kind, setKind] = useState<Kind>(seedFlow.kind);
  const [amount, setAmount] = useState(seedFlow.amount);
  const [currency, setCurrency] = useState(seedFlow.currency);
  const [source, setSource] = useState(
    kindOfSource(seed.source) === "api" ? "manual" : seed.source,
  );
  const [description, setDescription] = useState(seed.note ?? "");
  const [tags, setTags] = useState(seed.tags);
  const [date, setDate] = useState(seed.occurredOn);
  const [transfer, setTransfer] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);

  const sources = useAccountOptions("", open && !txId);

  const isWithdrawalExtId = isWithdrawalExternalId(seed.externalId);
  const isTransferFeeExtId = Boolean(
    seed.externalId?.startsWith(EXTERNAL_ID_PREFIX.transferFee),
  );

  const withdrawalToggleAvailableIgnoringTransfer =
    Boolean(txId) &&
    kind === "expense" &&
    !seed.transferGroup &&
    !isWithdrawalExtId &&
    !isTransferFeeExtId &&
    withdrawalAvailableFor(seed.source);
  const withdrawalWouldBeActive =
    withdrawal && withdrawalToggleAvailableIgnoringTransfer;

  const transferToggleAvailable =
    Boolean(txId) &&
    !seed.transferGroup &&
    !isWithdrawalExtId &&
    !isTransferFeeExtId &&
    kindOfSource(seed.source) !== "api" &&
    transferAvailableFor(seed.source) &&
    !withdrawalWouldBeActive;
  const transferActive = transfer && transferToggleAvailable;

  const withdrawalToggleAvailable =
    withdrawalToggleAvailableIgnoringTransfer && !transferActive;
  const withdrawalActive = withdrawal && withdrawalToggleAvailable;

  const transferDraft = useTransferDraft({
    txSource: seed.source,
    txCurrency: currency,
    txAmount: parseAmountInput(amount) ?? 0,
    sentOn: date,
    active: transferActive,
    pendingAllowed: kind === "expense",
  });
  const accountCurrencies = useAccountCurrencies();
  const withdrawalDraft = useWithdrawalDraft({
    currencies: settings.currencies,
    preferred: preferredAccountCurrency(
      accountCurrencies[seed.source],
      settings.currencies,
      seed.currency,
    ),
  });

  const entrySuggestions = useEntrySuggestionCatalog();
  const {
    suggestions,
    applySuggestion,
    inputHandlers: descriptionHandlers,
  } = useEntrySuggestions({
    entrySuggestions,
    description,
    disabled: transferActive || withdrawalActive,
    amount,
    tags,
    currencies: acceptedCurrencies(
      accountCurrencies[txId ? seed.source : source],
      settings.currencies,
    ),
    fill: {
      setDescription,
      setKind: kindLocked || txId ? undefined : setKind,
      setTags,
      setCurrency,
      setAmount,
      resetModes: () => {
        setTransfer(false);
        setWithdrawal(false);
      },
    },
  });

  const currencies = settings.currencies.includes(currency)
    ? settings.currencies
    : [currency, ...settings.currencies];

  const sourceOptions =
    sources && !sources.includes(source) ? [source, ...sources] : sources;

  const tagPicker = useTagPicker({ open, tags, setTags });

  const runOptions = {
    success: transferActive
      ? "Saved and marked as a transfer"
      : withdrawalActive
        ? "Saved and marked as a withdrawal"
        : successMessage,
    onSuccess: (data: { id: string } | undefined) => {
      onOpenChange(false);
      if (data) onCreated?.(data.id);
    },
  };

  function submitCreate() {
    const parsed = parseAndRoundAmount(amount, currency);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    run<{ id: string } | undefined>(
      () =>
        createTransaction({
          kind,
          amount: parsed.amount,
          currency,
          tags,
          note: description.trim() || null,
          occurredOn: date,
          source,
        }),
      runOptions,
    );
  }

  function submitEdit(id: string) {
    const parsed = flowEdited(seedFlow, { kind, currency, amount })
      ? parseAndRoundAmount(amount, currency)
      : null;
    if (parsed && !parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    const flow = parsed ? { kind, amount: parsed.amount, currency } : null;

    run<{ id: string } | undefined>(async () => {
      const result = await updateTransaction({
        id,
        ...(flow && { flow }),
        tags,
        note: description.trim() || null,
        occurredOn: date,
        source: seed.source,
      });
      if (!result.ok) return result;

      if (transferActive) {
        const markResult = await markAsTransfer(id, transferDraft.selected, {
          fees: transferDraft.bySide,
          receivedOn: transferDraft.receivedOn,
          ...(transferDraft.received
            ? { received: transferDraft.received }
            : {}),
        });
        return markResult.ok ? { ok: true, data: undefined } : markResult;
      }

      if (withdrawalActive) {
        const total = parseAmountInput(withdrawalDraft.total)!;
        const fee = parseAmountInput(withdrawalDraft.fee) ?? undefined;
        const convertResult = await convertToWithdrawal({
          id,
          chargedCurrency: withdrawalDraft.chargedCurrency,
          total,
          fee,
        });
        return convertResult.ok ? { ok: true, data: undefined } : convertResult;
      }

      return { ok: true, data: undefined };
    }, runOptions);
  }

  function submit() {
    if (!txId && !source) {
      toast.error("Pick an account");
      return;
    }
    if (transferActive && !transferDraft.selected) {
      toast.error("Pick the destination account");
      return;
    }
    if (withdrawalActive && parseAmountInput(withdrawalDraft.total) === null) {
      toast.error("Enter the total charged");
      return;
    }
    if (txId) submitEdit(txId);
    else submitCreate();
  }

  return {
    sourceOptions,
    kind,
    setKind,
    amount,
    setAmount,
    currency,
    setCurrency,
    currencies,
    source,
    setSource,
    description,
    setDescription,
    suggestions,
    applySuggestion,
    descriptionHandlers,
    tags,
    ...tagPicker,
    date,
    setDate,
    transfer,
    setTransfer,
    transferToggleAvailable,
    transferActive,
    transferDraft,
    withdrawal,
    setWithdrawal,
    withdrawalToggleAvailable,
    withdrawalActive,
    withdrawalDraft,
    pending,
    submit,
  };
}
