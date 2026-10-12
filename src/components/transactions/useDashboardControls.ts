"use client";

import { useMemo, useState } from "react";

import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { ALL_SOURCES } from "@/lib/constants/sources";
import { todayInTz } from "@/lib/dates";
import { applyListFilters, filterByAmount, initialSource } from "@/lib/filters";
import { dayTotalsWithPairs } from "@/lib/ledger/days";
import { movedOutMovements } from "@/lib/ledger/carriedOver";
import { monthMovements, scopedMovements } from "@/lib/ledger/scope";

import type { DayTotals } from "@/lib/ledger/days";
import type { Location, RecurringPayment } from "@/types/db";
import type { Movement } from "@/types/ledger";

import type { KindFilter } from "./balanceHero";

import { useDayTotalsCurrency } from "./useDayTotalsCurrency";

export type PanelMode = "none" | "filters" | "calendar" | "budget" | "add";
export type FilterScope = "month" | "all";

function parseAmount(input: string): number | undefined {
  const value = Number(input.replace(",", "."));
  return input.trim() && !Number.isNaN(value) && value > 0 ? value : undefined;
}

export function useDashboardControls({
  yearMonth,
  lifetimeMovements,
  reminders,
  places,
  sources,
}: {
  yearMonth: string;
  lifetimeMovements: Movement[];
  reminders: RecurringPayment[];
  places: Location[];
  sources: string[];
}) {
  const settings = useSettings();
  const timezone = useTimezone();
  const ratesByDate = useRatesByDate();
  const today = todayInTz(timezone);

  const [panel, setPanel] = useState<PanelMode>("none");
  const [selectedSource, setSelectedSource] = useState(() =>
    initialSource(
      settings.default_source,
      sources,
      settings.cash_enabled,
      settings.archived_sources,
    ),
  );
  const [selectedKind, setSelectedKind] = useState<KindFilter>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [scope, setScope] = useState<FilterScope>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const min = parseAmount(minInput);
  const max = parseAmount(maxInput);
  const amountActive = min != null || max != null;

  function togglePanel(mode: PanelMode) {
    setPanel((current) => (current === mode ? "none" : mode));
  }

  function openPanel(mode: Exclude<PanelMode, "none">) {
    setPanel(mode);
  }

  function closePanel() {
    setPanel("none");
  }

  const sourceFilteredLifetime = useMemo(
    () => scopedMovements(lifetimeMovements, selectedSource),
    [lifetimeMovements, selectedSource],
  );
  const sourceFilteredMonth = useMemo(
    () => monthMovements(sourceFilteredLifetime, selectedSource, yearMonth),
    [sourceFilteredLifetime, selectedSource, yearMonth],
  );
  const sourceFilteredMovedOut = useMemo(
    () => movedOutMovements(sourceFilteredLifetime, selectedSource, yearMonth),
    [sourceFilteredLifetime, selectedSource, yearMonth],
  );

  const listOptions = useMemo(
    () => ({
      kind: selectedKind,
      tag: selectedTag,
      place: selectedPlace,
      places,
      scope: selectedSource,
      baseCurrency: settings.base_currency,
      ratesByDate,
    }),
    [
      selectedKind,
      selectedTag,
      selectedPlace,
      places,
      selectedSource,
      settings.base_currency,
      ratesByDate,
    ],
  );

  const monthList = useMemo(
    () => applyListFilters(sourceFilteredMonth, listOptions),
    [sourceFilteredMonth, listOptions],
  );

  const movedOutList = useMemo(
    () => applyListFilters(sourceFilteredMovedOut, listOptions),
    [sourceFilteredMovedOut, listOptions],
  );

  const filterResults = useMemo(() => {
    const base = scope === "all" ? sourceFilteredLifetime : sourceFilteredMonth;
    const byKind = applyListFilters(base, {
      ...listOptions,
      tag: null,
      place: null,
    });
    return filterByAmount(
      byKind,
      { min, max },
      {
        scope: selectedSource,
        currency: settings.base_currency,
        ratesByDate,
      },
    );
  }, [
    scope,
    sourceFilteredLifetime,
    sourceFilteredMonth,
    listOptions,
    min,
    max,
    selectedSource,
    settings.base_currency,
    ratesByDate,
  ]);

  const activityDates = useMemo(
    () => new Set(lifetimeMovements.map((movement) => movement.occurredOn)),
    [lifetimeMovements],
  );
  const reminderDates = useMemo(
    () => new Set(reminders.map((reminder) => reminder.next_due_on)),
    [reminders],
  );

  const selectedDayRows = useMemo(
    () =>
      selectedDay
        ? lifetimeMovements.filter(
            (movement) => movement.occurredOn === selectedDay,
          )
        : [],
    [selectedDay, lifetimeMovements],
  );
  const selectedDayCurrency = useDayTotalsCurrency(
    selectedSource,
    selectedDayRows,
  );

  const selectedDayGroup = useMemo<DayTotals | null>(() => {
    if (!selectedDay) return null;
    const group = dayTotalsWithPairs(selectedDayRows, {
      scope: ALL_SOURCES,
      currency: selectedDayCurrency,
      ratesByDate,
    }).find((day) => day.date === selectedDay);
    return (
      group ?? {
        date: selectedDay,
        movements: [],
        income: 0,
        expense: 0,
        net: 0,
        pairs: [],
      }
    );
  }, [selectedDay, selectedDayRows, selectedDayCurrency, ratesByDate]);

  return {
    selectedDayCurrency,
    panel,
    togglePanel,
    openPanel,
    closePanel,
    selectedSource,
    setSelectedSource,
    selectedKind,
    setSelectedKind,
    selectedTag,
    setSelectedTag,
    selectedPlace,
    setSelectedPlace,
    minInput,
    setMinInput,
    maxInput,
    setMaxInput,
    scope,
    setScope,
    amountActive,
    selectedDay,
    setSelectedDay,
    sourceFilteredMonth,
    sourceFilteredLifetime,
    monthList,
    movedOutList,
    filterResults,
    activityDates,
    reminderDates,
    today,
    selectedDayGroup,
  };
}
