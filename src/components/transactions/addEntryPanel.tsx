"use client";

import type { EntrySuggestion } from "@/lib/entrySuggestions";

import { QuickAddForm } from "./quickAddForm";
import { useAddEntryPanel } from "./useAddEntryPanel";

export function AddEntryPanel({
  addSources,
  selectedSource,
  recentTags,
  entrySuggestions,
  onAdded,
}: {
  addSources: string[];
  selectedSource: string;
  recentTags: string[];
  entrySuggestions: EntrySuggestion[];
  onAdded: () => void;
}) {
  const { source, setSource } = useAddEntryPanel({
    addSources,
    selectedSource,
  });

  if (!source) return null;

  return (
    <QuickAddForm
      recentTags={recentTags}
      entrySuggestions={entrySuggestions}
      source={source}
      onAdded={onAdded}
      autoFocusAmount
      accountOptions={addSources}
      onSourceChange={setSource}
    />
  );
}
