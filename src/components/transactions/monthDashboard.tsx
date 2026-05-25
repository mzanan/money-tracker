"use client";

import { useMemo, useState } from "react";

import type { Transaction } from "@/types/db";

import { BalanceHero, type KindFilter } from "./balanceHero";
import { LifetimeChip } from "./lifetimeChip";
import { MonthView } from "./monthView";
import { SourcePills } from "./sourcePills";

interface Props {
  yearMonth: string;
  monthTransactions: Transaction[];
  lifetimeTransactions: Transaction[];
  sources: string[];
  quickAdd?: React.ReactNode;
  nav?: React.ReactNode;
}

export function MonthDashboard({
  yearMonth,
  monthTransactions,
  lifetimeTransactions,
  sources,
  quickAdd,
  nav,
}: Props) {
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedKind, setSelectedKind] = useState<KindFilter>("all");

  // Source-only filter → drives hero totals + lifetime chip + source pills.
  const sourceFilteredMonth = useMemo(
    () =>
      selectedSource === "all"
        ? monthTransactions
        : monthTransactions.filter((tx) => tx.source === selectedSource),
    [selectedSource, monthTransactions],
  );
  const sourceFilteredLifetime = useMemo(
    () =>
      selectedSource === "all"
        ? lifetimeTransactions
        : lifetimeTransactions.filter((tx) => tx.source === selectedSource),
    [selectedSource, lifetimeTransactions],
  );

  // Source + kind filter → drives the transaction list.
  const listTransactions = useMemo(
    () =>
      selectedKind === "all"
        ? sourceFilteredMonth
        : sourceFilteredMonth.filter((tx) => tx.kind === selectedKind),
    [selectedKind, sourceFilteredMonth],
  );

  return (
    <div className="grid gap-5">
      <BalanceHero
        yearMonth={yearMonth}
        transactions={sourceFilteredMonth}
        selectedKind={selectedKind}
        onKindChange={setSelectedKind}
        nav={nav}
      />
      {quickAdd}
      <SourcePills
        sources={sources}
        selected={selectedSource}
        onChange={setSelectedSource}
      />
      <MonthView transactions={listTransactions} />
      <LifetimeChip transactions={sourceFilteredLifetime} />
    </div>
  );
}
