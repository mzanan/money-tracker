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
        income: 0,
        expense: 0,
        net: 0,
        pairs: [],
      }}
      title={`Carried over from ${formatMonthLong(group.month)}`}
      showRowDate
      defaultOpen
    />
  );
}
