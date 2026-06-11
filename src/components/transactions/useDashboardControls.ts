"use client";

import { useMemo, useState } from "react";

import { useSettings, useTimezone } from "@/hooks/useSettings";
import { UNCATEGORIZED_LABEL } from "@/lib/constants/categories";
import { kindOfSource } from "@/lib/constants/sources";
import { todayInTz } from "@/lib/dates";
import { filterByAmount } from "@/lib/filters";
import { placeOf } from "@/lib/places";
import { dayTotalsList } from "@/lib/totals";

import type { DayTotals } from "@/lib/totals";
import type { Location, RecurringPayment, Transaction } from "@/types/db";

import type { KindFilter } from "./balanceHero";

export type PanelMode = "none" | "filters" | "calendar" | "budget";
export type FilterScope = "month" | "all";

function parseAmount(input: string): number | undefined {
  const value = Number(input.replace(",", "."));
  return input.trim() && !Number.isNaN(value) && value > 0 ? value : undefined;
}

function bySource(txs: Transaction[], source: string): Transaction[] {
  return source === "all" ? txs : txs.filter((tx) => tx.source === source);
}

export function useDashboardControls({
  monthTransactions,
  lifetimeTransactions,
  reminders,
  places,
}: {
  monthTransactions: Transaction[];
  lifetimeTransactions: Transaction[];
  reminders: RecurringPayment[];
  places: Location[];
}) {
  const settings = useSettings();
  const timezone = useTimezone();
  const today = todayInTz(timezone);

  const [panel, setPanel] = useState<PanelMode>("none");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedKind, setSelectedKind] = useState<KindFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [scope, setScope] = useState<FilterScope>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const min = parseAmount(minInput);
  const max = parseAmount(maxInput);
  const amountActive = min != null || max != null;
  const showQuickAdd =
    selectedSource === "all" || kindOfSource(selectedSource) === "manual";

  function togglePanel(mode: PanelMode) {
    setPanel((current) => (current === mode ? "none" : mode));
  }

  function openPanel(mode: Exclude<PanelMode, "none">) {
    setPanel(mode);
  }

  function closePanel() {
    setPanel("none");
  }

  const sourceFilteredMonth = useMemo(
    () => bySource(monthTransactions, selectedSource),
    [monthTransactions, selectedSource],
  );
  const sourceFilteredLifetime = useMemo(
    () => bySource(lifetimeTransactions, selectedSource),
    [lifetimeTransactions, selectedSource],
  );

  const monthList = useMemo(() => {
    let list = sourceFilteredMonth;
    if (selectedKind !== "all") {
      list = list.filter((tx) => tx.kind === selectedKind);
    }
    if (selectedCategory !== null) {
      list = list.filter(
        (tx) => (tx.category ?? UNCATEGORIZED_LABEL) === selectedCategory,
      );
    }
    if (selectedPlace !== null) {
      list = list.filter(
        (tx) => placeOf(tx.occurred_on, places) === selectedPlace,
      );
    }
    return list;
  }, [sourceFilteredMonth, selectedKind, selectedCategory, selectedPlace, places]);

  const filterResults = useMemo(() => {
    const base = scope === "all" ? sourceFilteredLifetime : sourceFilteredMonth;
    const byKind =
      selectedKind === "all"
        ? base
        : base.filter((tx) => tx.kind === selectedKind);
    return filterByAmount(byKind, { min, max }, settings.base_currency);
  }, [
    scope,
    sourceFilteredLifetime,
    sourceFilteredMonth,
    selectedKind,
    min,
    max,
    settings.base_currency,
  ]);

  const activityDates = useMemo(
    () => new Set(lifetimeTransactions.map((tx) => tx.occurred_on)),
    [lifetimeTransactions],
  );
  const reminderDates = useMemo(
    () => new Set(reminders.map((reminder) => reminder.next_due_on)),
    [reminders],
  );

  const selectedDayGroup = useMemo<DayTotals | null>(() => {
    if (!selectedDay) return null;
    const dayTxs = lifetimeTransactions.filter(
      (tx) => tx.occurred_on === selectedDay,
    );
    const [group] = dayTotalsList(dayTxs, settings.base_currency);
    return (
      group ?? {
        date: selectedDay,
        transactions: [],
        income: 0,
        expense: 0,
        net: 0,
      }
    );
  }, [selectedDay, lifetimeTransactions, settings.base_currency]);

  return {
    panel,
    togglePanel,
    openPanel,
    closePanel,
    selectedSource,
    setSelectedSource,
    selectedKind,
    setSelectedKind,
    selectedCategory,
    setSelectedCategory,
    selectedPlace,
    setSelectedPlace,
    minInput,
    setMinInput,
    maxInput,
    setMaxInput,
    scope,
    setScope,
    amountActive,
    showQuickAdd,
    selectedDay,
    setSelectedDay,
    sourceFilteredMonth,
    sourceFilteredLifetime,
    monthList,
    filterResults,
    activityDates,
    reminderDates,
    today,
    selectedDayGroup,
  };
}
