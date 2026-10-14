"use client";

import { useAccountCurrencies } from "@/hooks/useAccountCurrencies";
import { useSettings } from "@/hooks/useSettings";
import { isAllScope, soleScopeCurrency } from "@/lib/ledger/scope";

import type { MovementScope } from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

export function useDisplayCurrency(
  movements: ReadonlyArray<Movement>,
  scope: MovementScope,
): string {
  const settings = useSettings();
  const accountCurrencies = useAccountCurrencies();
  const declared = isAllScope(scope) ? undefined : accountCurrencies[scope];
  if (declared?.length === 1) return declared[0];
  return soleScopeCurrency(movements, scope) ?? settings.base_currency;
}
