"use client";

import { useMemo, useState } from "react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { setTransactionFixed } from "@/lib/actions/transactions";
import { resolveSourceLabel } from "@/lib/constants/sources";
import { actionTargetId, primaryAssetLine } from "@/lib/ledger/movements";
import { movementSpend } from "@/lib/ledger/valuation";
import { findUnusualExpenses } from "@/lib/unusualExpenses";

import type { Movement } from "@/types/ledger";

export function useUnusualExpenses(
  monthTransactions: Movement[],
  recurringNotes: Set<string>,
) {
  const settings = useSettings();
  const accountLabels = useAccountLabels();
  const ratesByDate = useRatesByDate();
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const oneOffAction = useServerAction();
  const regularAction = useServerAction();

  const candidates = useMemo(
    () =>
      findUnusualExpenses(
        monthTransactions,
        settings.fixed_labels,
        recurringNotes,
        settings.base_currency,
        ratesByDate,
      ),
    [
      monthTransactions,
      settings.fixed_labels,
      recurringNotes,
      settings.base_currency,
      ratesByDate,
    ],
  );

  const rows = useMemo(
    () =>
      candidates
        .filter((tx) => !answered.has(tx.id))
        .map((tx) => {
          return {
            tx,
            value: movementSpend(tx, settings.base_currency, ratesByDate) ?? 0,
            title:
              tx.tags[0] ||
              resolveSourceLabel(
                primaryAssetLine(tx)?.key ?? "",
                accountLabels,
              ),
          };
        }),
    [candidates, answered, settings.base_currency, ratesByDate, accountLabels],
  );

  function isRowPending(txId: string): boolean {
    return (
      pendingTxId === txId && (oneOffAction.pending || regularAction.pending)
    );
  }

  function unanswer(txId: string) {
    setAnswered((current) => {
      const next = new Set(current);
      next.delete(txId);
      return next;
    });
  }

  function markOneOff(tx: Movement) {
    setPendingTxId(tx.id);
    setAnswered((current) => new Set(current).add(tx.id));
    oneOffAction.run(() => setTransactionFixed(actionTargetId(tx), true), {
      success: "Marked as non-daily",
      onError: () => unanswer(tx.id),
    });
  }

  function markRegular(tx: Movement) {
    setPendingTxId(tx.id);
    setAnswered((current) => new Set(current).add(tx.id));
    regularAction.run(() => setTransactionFixed(actionTargetId(tx), false), {
      success: "Marked as daily",
      onError: () => unanswer(tx.id),
    });
  }

  return { rows, isRowPending, markOneOff, markRegular };
}
