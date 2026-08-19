"use client";

import { Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/ui/stepShell";

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
    <StepShell
      title="Change account"
      description="Move this transaction to a different account."
      onBack={onBack}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button disabled={!selected || pending} onClick={submit}>
            {pending && <Loader2Icon className="animate-spin" />}
            Save
          </Button>
        </>
      }
    >
      <AccountSelect
        sources={sources}
        value={selected}
        onValueChange={setSelected}
        emptyMessage="No other account to pick. Import or add one first."
      />
    </StepShell>
  );
}
