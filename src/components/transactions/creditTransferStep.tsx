"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/ui/stepShell";
import type { PendingTransfer } from "@/lib/ledger/movements";

import copy from "./creditTransfer.json";
import { CreditTransferFields } from "./creditTransferFields";
import { useCreditTransfer } from "./useCreditTransfer";

export function CreditTransferStep({
  transfer,
  onBack,
}: {
  transfer: PendingTransfer;
  onBack: () => void;
}) {
  const form = useCreditTransfer({ transfer, onDone: onBack });

  return (
    <StepShell
      title={copy.title}
      description={copy.description}
      onBack={onBack}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button disabled={!form.canSubmit} onClick={form.submit}>
            {form.pending && <Loader2Icon className="animate-spin" />}
            Confirm
          </Button>
        </>
      }
    >
      <CreditTransferFields
        idPrefix="credit-step"
        transfer={transfer}
        form={form}
      />
    </StepShell>
  );
}
