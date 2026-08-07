"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { createTransaction } from "@/lib/actions/transactions";
import { getTransferAccountOptions } from "@/lib/actions/transfers";
import { kindOfSource } from "@/lib/constants/sources";
import { parseAndRoundAmount } from "@/lib/currency";

import type { Kind } from "./kindToggle";

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
  open,
  onOpenChange,
  successMessage,
  onCreated,
}: {
  seed: TransactionSeed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  successMessage: string;
  onCreated?: (id: string) => void;
}) {
  const settings = useSettings();
  const { run, pending } = useServerAction();

  const [sources, setSources] = useState<string[] | null>(null);
  const [kind, setKind] = useState<Kind>(seed.kind);
  const [amount, setAmount] = useState(seed.amount.toString());
  const [currency, setCurrency] = useState(seed.currency);
  const [source, setSource] = useState(
    kindOfSource(seed.source) === "api" ? "manual" : seed.source,
  );
  const [description, setDescription] = useState(seed.note ?? "");
  const [tagsInput, setTagsInput] = useState(seed.tags.join(", "));
  const [date, setDate] = useState(seed.occurredOn);

  useEffect(() => {
    if (!open) return;
    getTransferAccountOptions("").then((result) => {
      if (result.ok) setSources(result.data!.sources);
    });
  }, [open]);

  const currencies = settings.currencies.includes(currency)
    ? settings.currencies
    : [currency, ...settings.currencies];

  const sourceOptions =
    sources && !sources.includes(source) ? [source, ...sources] : sources;

  function submit() {
    const parsed = parseAndRoundAmount(amount, currency);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    if (!source) {
      toast.error("Pick an account");
      return;
    }

    run(
      () =>
        createTransaction({
          kind,
          amount: parsed.amount,
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
    tagsInput,
    setTagsInput,
    date,
    setDate,
    pending,
    submit,
  };
}
