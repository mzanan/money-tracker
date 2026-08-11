"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAccountOptions } from "./useAccountOptions";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import {
  createTransaction,
  getUsedTags,
  updateTransaction,
} from "@/lib/actions/transactions";
import { kindOfSource } from "@/lib/constants/sources";
import { parseAndRoundAmount } from "@/lib/currency";
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

  const sources = useAccountOptions("", open && !txId);

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
          return result.ok ? { ok: true, data: undefined } : result;
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
        success: successMessage,
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
    pending,
    submit,
  };
}
