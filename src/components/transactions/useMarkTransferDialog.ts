"use client";

import { useTransferDraft } from "./useTransferDraft";
import { useServerAction } from "@/hooks/useServerAction";
import { markAsTransfer } from "@/lib/actions/transfers";

export function useMarkTransferDialog({
  txId,
  txSource,
  txCurrency,
  txAmount,
  open,
  onOpenChange,
}: {
  txId: string;
  txSource: string;
  txCurrency: string;
  txAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { run, pending } = useServerAction();
  const draft = useTransferDraft({
    txSource,
    txCurrency,
    txAmount,
    active: open,
  });

  function submit() {
    if (!draft.selected) return;
    run(
      () =>
        markAsTransfer(txId, draft.selected, {
          fees: draft.bySide,
          ...(draft.received ? { received: draft.received } : {}),
        }),
      {
        success: "Marked as a transfer",
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return {
    sources: draft.sources,
    selected: draft.selected,
    setSelected: draft.setSelected,
    fees: draft.fees,
    setFees: draft.setFees,
    receivedAmount: draft.receivedAmount,
    setReceivedAmount: draft.setReceivedAmount,
    receivedCurrency: draft.receivedCurrency,
    setReceivedCurrency: draft.setReceivedCurrency,
    destinationCurrency: draft.destinationCurrency,
    preview: draft.preview,
    pending,
    submit,
  };
}
