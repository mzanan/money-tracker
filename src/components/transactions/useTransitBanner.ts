"use client";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useHideAmounts } from "@/hooks/useHideAmounts";
import { formatMoney } from "@/lib/currency";
import { pendingTransfer } from "@/lib/ledger/movements";
import {
  transferLabel,
  transitBannerDetail,
  transitBannerTitle,
} from "@/lib/transactionDisplay";
import type { Movement } from "@/types/ledger";

export function useTransitBanner(movements: Movement[]) {
  const labels = useAccountLabels();
  const { mask } = useHideAmounts();
  const first = movements.length > 0 ? pendingTransfer(movements[0]) : null;
  if (!first) return null;
  return {
    title: transitBannerTitle(movements.length),
    detail: transitBannerDetail(
      mask(formatMoney(first.amount, first.currency)),
      transferLabel(first, labels),
    ),
  };
}
