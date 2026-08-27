"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAccountOptions } from "./useAccountOptions";
import { useTransferDraft } from "./useTransferDraft";
import { useWithdrawalDraft } from "./useWithdrawalDraft";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { convertToWithdrawal } from "@/lib/actions/cash";
import { markAsTransfer } from "@/lib/actions/transfers";
import {
  createTransaction,
  getUsedTags,
  updateTransaction,
} from "@/lib/actions/transactions";
import {
  kindOfSource,
  transferAvailableFor,
  withdrawalAvailableFor,
} from "@/lib/constants/sources";
import { parseAmountInput, parseAndRoundAmount } from "@/lib/currency";
import { EXTERNAL_ID_PREFIX, isWithdrawalExternalId } from "@/lib/externalIds";
import { canonicalTag, tagKey } from "@/lib/tags";

import type { Kind } from "./kindToggle";

const MAX_TAG_SUGGESTIONS = 12;
const MAX_TAGS = 10;

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
  open,
  onOpenChange,
  successMessage,
  onCreated,
}: {
  seed: TransactionSeed;
  txId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  successMessage?: string;
  onCreated?: (id: string) => void;
}) {
  const settings = useSettings();
  const { run, pending } = useServerAction();

  const [kind, setKind] = useState<Kind>(seed.kind);
  const [amount, setAmount] = useState(seed.amount.toString());
  const [currency, setCurrency] = useState(seed.currency);
  const [source, setSource] = useState(
    kindOfSource(seed.source) === "api" ? "manual" : seed.source,
  );
  const [description, setDescription] = useState(seed.note ?? "");
  const [tags, setTags] = useState(seed.tags);
  const [tagInput, setTagInput] = useState("");
  const [usedTags, setUsedTags] = useState<string[] | null>(null);
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
    transferAvailableFor(seed.source, settings.cash_enabled) &&
    !withdrawalWouldBeActive;
  const transferActive = transfer && transferToggleAvailable;

  const withdrawalToggleAvailable =
    withdrawalToggleAvailableIgnoringTransfer && !transferActive;
  const withdrawalActive = withdrawal && withdrawalToggleAvailable;

  const transferDraft = useTransferDraft({
    txSource: seed.source,
    txCurrency: currency,
    txAmount: parseAmountInput(amount) ?? 0,
    active: transferActive,
  });
  const withdrawalDraft = useWithdrawalDraft({
    currencies: settings.currencies,
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getUsedTags().then((res) => {
      if (!cancelled && res.ok) setUsedTags(res.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const currencies = settings.currencies.includes(currency)
    ? settings.currencies
    : [currency, ...settings.currencies];

  const sourceOptions =
    sources && !sources.includes(source) ? [source, ...sources] : sources;

  const currentTagKeys = new Set(tags.map(tagKey));
  const tagLimitReached = tags.length >= MAX_TAGS;
  const query = tagKey(tagInput);
  const tagSuggestions = tagLimitReached
    ? []
    : (usedTags ?? [])
        .filter((tag) => !currentTagKeys.has(tagKey(tag)))
        .filter((tag) => (query ? tagKey(tag).includes(query) : true))
        .slice(0, MAX_TAG_SUGGESTIONS);

  function addTag(raw: string) {
    if (tagLimitReached) {
      toast.error(`Max ${MAX_TAGS} tags`);
      return;
    }
    const canonical = canonicalTag(raw);
    setTagInput("");
    if (!canonical) return;
    if (currentTagKeys.has(tagKey(canonical))) return;
    setTags((prev) => [...prev, canonical]);
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function submit() {
    const parsed = parseAndRoundAmount(amount, currency);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
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

    run<{ id: string } | undefined>(
      async () => {
        if (txId) {
          const result = await updateTransaction({
            id: txId,
            kind,
            amount: parsed.amount,
            currency,
            tags,
            note: description.trim() || null,
            occurredOn: date,
          });
          if (!result.ok) return result;

          if (transferActive) {
            const markResult = await markAsTransfer(
              txId,
              transferDraft.selected,
              {
                fees: transferDraft.bySide,
                ...(transferDraft.received
                  ? { received: transferDraft.received }
                  : {}),
              },
            );
            return markResult.ok ? { ok: true, data: undefined } : markResult;
          }

          if (withdrawalActive) {
            const total = parseAmountInput(withdrawalDraft.total)!;
            const fee = parseAmountInput(withdrawalDraft.fee) ?? undefined;
            const convertResult = await convertToWithdrawal({
              id: txId,
              chargedCurrency: withdrawalDraft.chargedCurrency,
              total,
              fee,
            });
            return convertResult.ok
              ? { ok: true, data: undefined }
              : convertResult;
          }

          return { ok: true, data: undefined };
        }
        return createTransaction({
          kind,
          amount: parsed.amount,
          currency,
          tags,
          note: description.trim() || null,
          occurredOn: date,
          source,
        });
      },
      {
        success: transferActive
          ? "Saved and marked as a transfer"
          : withdrawalActive
            ? "Saved and marked as a withdrawal"
            : successMessage,
        onSuccess: (data) => {
          onOpenChange(false);
          if (data) onCreated?.(data.id);
        },
      },
    );
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
    tags,
    tagInput,
    setTagInput,
    tagSuggestions,
    tagLimitReached,
    addTag,
    removeTag,
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
