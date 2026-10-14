"use client";

import { useTransferDraft } from "./useTransferDraft";
import { useServerAction } from "@/hooks/useServerAction";
import { markAsTransfer } from "@/lib/actions/transfers";

export function useMarkTransferDialog({
  txId,
  txSource,
  txCurrency,
  txAmount,
  txDate,
  open,
  onOpenChange,
}: {
  txId: string;
  txSource: string;
  txCurrency: string;
  txAmount: number;
  txDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { run, pending } = useServerAction();
  const draft = useTransferDraft({
    txSource,
    txCurrency,
    txAmount,
    sentOn: txDate,
    active: open,
  });

  function submit() {
    if (!draft.selected) return;
    run(
      () =>
        markAsTransfer(txId, draft.selected, {
          fees: draft.bySide,
          receivedOn: draft.receivedOn,
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
    receivedRequired: draft.receivedRequired,
    setReceivedCurrency: draft.setReceivedCurrency,
    destinationCurrency: draft.destinationCurrency,
    preview: draft.preview,
    notReceived: draft.notReceived,
    setNotReceived: draft.setNotReceived,
    creditedOn: draft.creditedOn,
    setCreditedOn: draft.setCreditedOn,
    pending,
    submit,
  };
}
