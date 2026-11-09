"use client";

import { useMemo } from "react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useLedgerMovements } from "@/hooks/useLedgerMovements";
import { fullMovement } from "@/lib/ledger/movements";
import { transactionDetail } from "@/lib/transactionDetail";
import type { Movement } from "@/types/ledger";

export function useTransactionDetail(movement: Movement) {
  const movements = useLedgerMovements();
  const labels = useAccountLabels();
  const { mask } = useHideAmounts();
  const detail = useMemo(
    () => transactionDetail(fullMovement(movements, movement), labels),
    [movements, movement, labels],
  );
  return { detail, mask };
}
