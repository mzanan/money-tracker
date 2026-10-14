"use client";

import { useDayTotalsInAccount } from "@/hooks/useDayTotalsInAccount";
import { useSettings } from "@/hooks/useSettings";
import { isAllScope } from "@/lib/ledger/scope";

import type { MovementScope } from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

import { useDisplayCurrency } from "./useDisplayCurrency";

export function useDayTotalsCurrency(
  scope: MovementScope,
  movements: ReadonlyArray<Movement>,
): string {
  const settings = useSettings();
  const { dayTotalsInAccount } = useDayTotalsInAccount();
  const accountCurrency = useDisplayCurrency(movements, scope);
  if (!dayTotalsInAccount || isAllScope(scope)) return settings.base_currency;
  return accountCurrency;
}
