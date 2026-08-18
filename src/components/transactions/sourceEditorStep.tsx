"use client";

import { ChevronLeftIcon, Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
import { Button } from "@/components/ui/button";

import { useSourceEditor } from "./useSourceEditor";

export function SourceEditorStep({
  txId,
  txSource,
  onBack,
}: {
  txId: string;
  txSource: string;
  onBack: () => void;
}) {
  const { sources, selected, setSelected, pending, submit } = useSourceEditor({
    txId,
    txSource,
    open: true,
    onOpenChange: (open) => {
      if (!open) onBack();
    },
  });

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={onBack}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0 pt-1">
          <p className="text-sm font-semibold">Change account</p>
          <p className="text-muted-foreground text-xs">
            Move this transaction to a different account.
          </p>
        </div>
      </div>

      <AccountSelect
        sources={sources}
        value={selected}
        onValueChange={setSelected}
        emptyMessage="No other account to pick. Import or add one first."
      />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>
          Cancel
        </Button>
        <Button disabled={!selected || pending} onClick={submit}>
          {pending && <Loader2Icon className="animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
