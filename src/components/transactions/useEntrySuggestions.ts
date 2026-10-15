"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  matchEntrySuggestions,
  suggestionAmountFill,
  suggestionKey,
  type EntrySuggestion,
} from "@/lib/entrySuggestions";
import { sameTags } from "@/lib/tags";

import type { Kind } from "./kindToggle";

interface EntrySuggestionFill {
  setDescription: (value: string) => void;
  setKind?: (value: Kind) => void;
  setTags: (value: string[]) => void;
  setCurrency: (value: string) => void;
  setAmount: (value: string) => void;
  resetModes?: () => void;
}

export function useEntrySuggestions({
  entrySuggestions,
  description,
  disabled,
  amount,
  tags,
  currencies,
  fill,
}: {
  entrySuggestions: EntrySuggestion[];
  description: string;
  disabled: boolean;
  amount: string;
  tags: string[];
  currencies: string[];
  fill: EntrySuggestionFill;
}) {
  const [appliedKey, setAppliedKey] = useState<string | null>(() =>
    description ? suggestionKey(description) : null,
  );
  const [open, setOpen] = useState(false);
  const [filledAmount, setFilledAmount] = useState<string | null>(null);
  const [filledTags, setFilledTags] = useState<string[] | null>(null);

  if (appliedKey !== null && suggestionKey(description) !== appliedKey) {
    setAppliedKey(null);
  }

  const matches = useMemo(
    () => matchEntrySuggestions(entrySuggestions, description),
    [entrySuggestions, description],
  );

  function applySuggestion(suggestion: EntrySuggestion) {
    fill.setDescription(suggestion.note);
    fill.setKind?.(suggestion.kind);
    if (tags.length === 0 || sameTags(tags, filledTags)) {
      fill.setTags(suggestion.tags);
      setFilledTags(suggestion.tags);
    }
    fill.resetModes?.();
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
  }

  const hidden = disabled || !open || appliedKey !== null;
  const listVisible = !hidden && matches.length > 0;
  const listVisibleRef = useRef(listVisible);

  useLayoutEffect(() => {
    listVisibleRef.current = listVisible;
  }, [listVisible]);

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      if (listVisibleRef.current) event.stopPropagation();
      setOpen(false);
    };
    node.addEventListener("keydown", closeOnEscape);
    return () => node.removeEventListener("keydown", closeOnEscape);
  }, []);

  const inputHandlers = {
    ref,
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Escape") setOpen(true);
    },
  };

  return { suggestions: hidden ? [] : matches, applySuggestion, inputHandlers };
}
