"use client";

import { useState } from "react";

import { useAccountOptions } from "./useAccountOptions";
import { useServerAction } from "@/hooks/useServerAction";
import { markAsTransfer } from "@/lib/actions/transfers";
import { parseAmountInput } from "@/lib/currency";

export function useMarkTransferDialog({
  txId,
  txSource,
  open,
  onOpenChange,
}: {
  txId: string;
  txSource: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { run, pending } = useServerAction();
  const [selected, setSelected] = useState("");
  const [fee, setFee] = useState("");
  const sources = useAccountOptions(txSource, open, () => {
    setSelected("");
    setFee("");
  });

  function submit() {
    if (!selected) return;
    run(() => markAsTransfer(txId, selected, parseAmountInput(fee) ?? undefined), {
      success: "Marked as a transfer",
      onSuccess: () => onOpenChange(false),
    });
  }

  return { sources, selected, setSelected, fee, setFee, pending, submit };
}
