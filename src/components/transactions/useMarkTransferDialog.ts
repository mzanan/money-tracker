"use client";

import { useEffect, useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import {
  getTransferAccountOptions,
  markAsTransfer,
} from "@/lib/actions/transfers";

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
  const [sources, setSources] = useState<string[] | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!open) return;
    getTransferAccountOptions(txSource).then((result) => {
      if (!result.ok) return;
      setSources(result.data!.sources);
      setSelected("");
    });
  }, [open, txSource]);

  function submit() {
    if (!selected) return;
    run(() => markAsTransfer(txId, selected), {
      success: "Marked as a transfer",
      onSuccess: () => onOpenChange(false),
    });
  }

  return { sources, selected, setSelected, pending, submit };
}
