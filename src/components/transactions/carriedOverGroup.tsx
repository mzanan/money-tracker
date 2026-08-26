"use client";

import { formatMonthLong } from "@/lib/dates";

import { DayGroup } from "./dayGroup";

import type { CarriedOverGroup as CarriedOverGroupData } from "@/lib/budgetMonth";

export function CarriedOverGroup({ group }: { group: CarriedOverGroupData }) {
  return (
    <DayGroup
      day={{
        date: `${group.month}-01`,
        transactions: group.transactions,
        income: group.income,
        expense: group.expense,
        net: group.net,
        pairs: group.pairs,
      }}
      title={`Carried over from ${formatMonthLong(group.month)}`}
      showRowDate
      defaultOpen
    />
  );
}
