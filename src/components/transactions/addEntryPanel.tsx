"use client";

import { Label } from "@/components/ui/label";

import { AccountSelect } from "./accountSelect";
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
  const { accountId, source, setSource } = useAddEntryPanel({
    addSources,
    selectedSource,
  });

  if (!source) return null;

  return (
    <div className="grid gap-4">
      {addSources.length > 1 && (
        <div className="grid gap-1.5">
          <Label htmlFor={accountId}>Account</Label>
          <AccountSelect
            id={accountId}
            sources={addSources}
            value={source}
            onValueChange={setSource}
          />
        </div>
      )}
      <QuickAddForm recentTags={recentTags} source={source} onAdded={onAdded} />
    </div>
  );
}
