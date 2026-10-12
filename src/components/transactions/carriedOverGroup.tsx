"use client";

import { formatMonthLong } from "@/lib/dates";

import { DayGroup } from "./dayGroup";

import type { CarriedOverGroup as CarriedOverGroupData } from "@/lib/ledger/carriedOver";
import type { MovementScope } from "@/lib/ledger/scope";

export function CarriedOverGroup({
  group,
  currency,
  scope,
}: {
  group: CarriedOverGroupData;
  currency?: string;
  scope: MovementScope;
}) {
  return (
    <DayGroup
      day={{
        date: `${group.month}-01`,
        movements: group.movements,
        income: group.income,
        expense: group.expense,
        net: group.net,
        pairs: group.pairs,
      }}
      title={`Carried over from ${formatMonthLong(group.month)}`}
      showRowDate
      currency={currency}
      scope={scope}
    />
  );
}
