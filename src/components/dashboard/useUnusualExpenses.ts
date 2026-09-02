"use client";

import { useMemo, useState } from "react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { setTransactionFixed } from "@/lib/actions/transactions";
import { resolveSourceLabel } from "@/lib/constants/sources";
import { transactionInDisplay } from "@/lib/totals";
import { findUnusualExpenses } from "@/lib/unusualExpenses";

import type { Transaction } from "@/types/db";

export function useUnusualExpenses(monthTransactions: Transaction[]) {
  const settings = useSettings();
  const accountLabels = useAccountLabels();
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const oneOffAction = useServerAction();
  const regularAction = useServerAction();

  const candidates = useMemo(
    () =>
      findUnusualExpenses(
        monthTransactions,
        settings.fixed_labels,
        settings.base_currency,
      ),
    [monthTransactions, settings.fixed_labels, settings.base_currency],
  );

  const rows = useMemo(
    () =>
      candidates
        .filter((tx) => !answered.has(tx.id))
        .map((tx) => {
          let value = 0;
          try {
            value = transactionInDisplay(tx, settings.base_currency);
          } catch {
            value = 0;
          }
          return {
            tx,
            value,
            title: tx.tags[0] || resolveSourceLabel(tx.source, accountLabels),
          };
        }),
    [candidates, answered, settings.base_currency, accountLabels],
  );

  function isRowPending(txId: string): boolean {
    return (
      pendingTxId === txId && (oneOffAction.pending || regularAction.pending)
    );
  }

  function markOneOff(tx: Transaction) {
    setPendingTxId(tx.id);
    setAnswered((current) => new Set(current).add(tx.id));
    oneOffAction.run(() => setTransactionFixed(tx.id, true), {
      success: "Marked as one-off",
    });
  }

  function markRegular(tx: Transaction) {
    setPendingTxId(tx.id);
    setAnswered((current) => new Set(current).add(tx.id));
    regularAction.run(() => setTransactionFixed(tx.id, false), {
      success: "Marked as regular",
    });
  }

  return { rows, isRowPending, markOneOff, markRegular };
}
