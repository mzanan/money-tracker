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

import type { Transaction } from "@/types/db";

export function useDuplicateTransaction({
  tx,
  open,
  onOpenChange,
}: {
  tx: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const settings = useSettings();
  const { run, pending } = useServerAction();

  const [sources, setSources] = useState<string[] | null>(null);
  const [kind, setKind] = useState<Kind>(tx.kind);
  const [amount, setAmount] = useState(tx.amount_original.toString());
  const [currency, setCurrency] = useState(tx.currency_original);
  const [source, setSource] = useState(
    kindOfSource(tx.source) === "api" ? "manual" : tx.source,
  );
  const [description, setDescription] = useState(tx.note ?? "");
  const [tagsInput, setTagsInput] = useState(tx.tags.join(", "));
  const [date, setDate] = useState(tx.occurred_on);

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
        success: "Duplicated",
        onSuccess: () => onOpenChange(false),
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
