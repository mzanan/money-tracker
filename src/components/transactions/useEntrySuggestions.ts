"use client";

import { useMemo, useState, type KeyboardEvent } from "react";

import {
  matchEntrySuggestions,
  suggestionAmountFill,
  suggestionKey,
  type EntrySuggestion,
} from "@/lib/entrySuggestions";

import type { Kind } from "./kindToggle";

interface EntrySuggestionFill {
  setDescription: (value: string) => void;
  setKind: (value: Kind) => void;
  setTagsInput: (value: string) => void;
  setCurrency: (value: string) => void;
  setAmount: (value: string) => void;
  resetModes: () => void;
}

export function useEntrySuggestions({
  entrySuggestions,
  description,
  disabled,
  amount,
  currencies,
  source,
  accountOptions,
  onSourceChange,
  fill,
}: {
  entrySuggestions: EntrySuggestion[];
  description: string;
  disabled: boolean;
  amount: string;
  currencies: string[];
  source: string;
  accountOptions: string[];
  onSourceChange?: (source: string) => void;
  fill: EntrySuggestionFill;
}) {
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filledAmount, setFilledAmount] = useState<string | null>(null);

  if (appliedKey !== null && suggestionKey(description) !== appliedKey) {
    setAppliedKey(null);
  }

  const matches = useMemo(
    () => matchEntrySuggestions(entrySuggestions, description),
    [entrySuggestions, description],
  );

  function applySuggestion(suggestion: EntrySuggestion) {
    fill.setDescription(suggestion.note);
    fill.setKind(suggestion.kind);
    fill.setTagsInput(suggestion.tags.join(", "));
    fill.resetModes();
    setAppliedKey(suggestion.key);
    const amountFill = suggestionAmountFill(suggestion, {
      amount,
      filledAmount,
      currencies,
    });
    if (amountFill) {
      if (amountFill.currency) fill.setCurrency(amountFill.currency);
      fill.setAmount(amountFill.amount);
      setFilledAmount(amountFill.amount || null);
    }
    if (
      onSourceChange &&
      suggestion.source !== source &&
      accountOptions.includes(suggestion.source)
    ) {
      onSourceChange(suggestion.source);
    }
  }

  const hidden = disabled || !open || appliedKey !== null;

  const inputHandlers = {
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Escape") {
        setOpen(true);
        return;
      }
      if (!hidden && matches.length > 0) event.stopPropagation();
      setOpen(false);
    },
  };

  return { suggestions: hidden ? [] : matches, applySuggestion, inputHandlers };
}
