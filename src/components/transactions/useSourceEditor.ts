"use client";

import { useState } from "react";

import { useAccountOptions } from "./useAccountOptions";
import { useServerAction } from "@/hooks/useServerAction";
import { updateTransactionSource } from "@/lib/actions/transactions";

export function useSourceEditor({
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
  const sources = useAccountOptions(txSource, open, () => setSelected(""));

  function submit() {
    if (!selected) return;
    run(() => updateTransactionSource(txId, selected), {
      success: "Account updated",
      onSuccess: () => onOpenChange(false),
    });
  }

  return { sources, selected, setSelected, pending, submit };
}
