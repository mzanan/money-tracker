"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { mergeTransactions } from "@/lib/actions/transactions";
import { useUiStore } from "@/stores/uiStore";
import type { Transaction } from "@/types/db";

export function useMergeBar() {
  const txSelectMode = useUiStore((s) => s.txSelectMode);
  const selectedTxs = useUiStore((s) => s.selectedTxs);
  const setTxSelectMode = useUiStore((s) => s.setTxSelectMode);
  const [choosing, setChoosing] = useState(false);
  const [markingTransfer, setMarkingTransfer] = useState(false);
  const { run, pending } = useServerAction();

  const canResolve = selectedTxs.length === 2;
  const [first, second] = selectedTxs;
  const canMarkTransfer = canResolve && first.kind !== second.kind;
  const expenseTx =
    canMarkTransfer && first.kind === "expense" ? first : second;
  const incomeTx =
    canMarkTransfer && first.kind === "expense" ? second : first;

  function keep(keepTx: Transaction, removeTx: Transaction) {
    run(() => mergeTransactions(keepTx.id, removeTx.id), {
      success: "Unified into one transaction",
      onSuccess: () => {
        setChoosing(false);
        setTxSelectMode(false);
      },
    });
  }

  return {
    txSelectMode,
    selectedTxs,
    setTxSelectMode,
    choosing,
    setChoosing,
    markingTransfer,
    setMarkingTransfer,
    pending,
    canResolve,
    first,
    second,
    canMarkTransfer,
    expenseTx,
    incomeTx,
    keep,
  };
}
