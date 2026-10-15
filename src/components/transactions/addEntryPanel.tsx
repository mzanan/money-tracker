"use client";

import { QuickAddForm } from "./quickAddForm";
import { useAddEntryPanel } from "./useAddEntryPanel";

export function AddEntryPanel({
  addSources,
  selectedSource,
  recentTags,
  onAdded,
}: {
  addSources: string[];
  selectedSource: string;
  recentTags: string[];
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
      source={source}
      onAdded={onAdded}
      autoFocusAmount
      accountOptions={addSources}
      onSourceChange={setSource}
    />
  );
}
