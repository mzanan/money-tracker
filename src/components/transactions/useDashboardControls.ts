"use client";

import { useMemo, useState } from "react";

import { useRates } from "@/hooks/useRates";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { kindOfSource } from "@/lib/constants/sources";
import { monthBounds, todayInTz } from "@/lib/dates";
import { filterByAmount } from "@/lib/filters";
import { dayTotalsList } from "@/lib/totals";
import { useUiStore } from "@/stores/uiStore";

import type { DayTotals } from "@/lib/totals";
import type { RecurringPayment, Transaction } from "@/types/db";

import type { KindFilter } from "./balanceHero";

export type PanelMode = "none" | "filters" | "calendar";
export type FilterScope = "month" | "all";

function parseAmount(input: string): number | undefined {
  const value = Number(input.replace(",", "."));
  return input.trim() && !Number.isNaN(value) && value > 0 ? value : undefined;
}

function bySource(txs: Transaction[], source: string): Transaction[] {
  return source === "all" ? txs : txs.filter((tx) => tx.source === source);
}

export function useDashboardControls({
  yearMonth,
  monthTransactions,
  lifetimeTransactions,
  reminders,
}: {
  yearMonth: string;
  monthTransactions: Transaction[];
  lifetimeTransactions: Transaction[];
  reminders: RecurringPayment[];
}) {
  const settings = useSettings();
  const timezone = useTimezone();
  const ratesQuery = useRates();
  const displayMode = useUiStore((s) => s.displayMode);
  const rates = ratesQuery.data?.rates;
  const today = todayInTz(timezone);

  const [panel, setPanel] = useState<PanelMode>("none");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedKind, setSelectedKind] = useState<KindFilter>("all");
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

  const monthList = useMemo(
    () =>
      selectedKind === "all"
        ? sourceFilteredMonth
        : sourceFilteredMonth.filter((tx) => tx.kind === selectedKind),
    [sourceFilteredMonth, selectedKind],
  );

  const filterResults = useMemo(() => {
    const base = scope === "all" ? sourceFilteredLifetime : sourceFilteredMonth;
    const byKind =
      selectedKind === "all"
        ? base
        : base.filter((tx) => tx.kind === selectedKind);
    return filterByAmount(
      byKind,
      { min, max },
      settings.base_currency,
      displayMode,
      rates,
    );
  }, [
    scope,
    sourceFilteredLifetime,
    sourceFilteredMonth,
    selectedKind,
    min,
    max,
    settings.base_currency,
    displayMode,
    rates,
  ]);

  const activityDates = useMemo(
    () => new Set(lifetimeTransactions.map((tx) => tx.occurred_on)),
    [lifetimeTransactions],
  );
  const reminderDates = useMemo(
    () => new Set(reminders.map((reminder) => reminder.next_due_on)),
    [reminders],
  );

  const monthReminders = useMemo(() => {
    const [start, end] = monthBounds(yearMonth);
    return reminders
      .filter((r) => r.next_due_on >= start && r.next_due_on <= end)
      .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  }, [reminders, yearMonth]);

  const selectedDayGroup = useMemo<DayTotals | null>(() => {
    if (!selectedDay) return null;
    const dayTxs = lifetimeTransactions.filter(
      (tx) => tx.occurred_on === selectedDay,
    );
    const [group] = dayTotalsList(
      dayTxs,
      settings.base_currency,
      displayMode,
      rates,
    );
    return (
      group ?? {
        date: selectedDay,
        transactions: [],
        income: 0,
        expense: 0,
        net: 0,
      }
    );
  }, [selectedDay, lifetimeTransactions, settings.base_currency, displayMode, rates]);

  return {
    panel,
    togglePanel,
    closePanel,
    selectedSource,
    setSelectedSource,
    selectedKind,
    setSelectedKind,
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
    monthReminders,
    today,
    selectedDayGroup,
  };
}
