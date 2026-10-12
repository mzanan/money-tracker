"use client";

import { useEffect, useMemo, useState } from "react";

import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useSettings } from "@/hooks/useSettings";
import { hasBudgetMonthOverride } from "@/lib/ledger/carriedOver";
import { onScopedDate } from "@/lib/ledger/scope";
import { addableSources } from "@/lib/constants/sources";
import { activeListFilterCount, listFilterChoices } from "@/lib/filters";
import { detectRecurringNotes } from "@/lib/unusualExpenses";
import {
  forwardMonthCap,
  newestYearMonthFrom,
  oldestYearMonthFrom,
  shiftYearMonth,
} from "@/lib/dates";

import { useDashboardControls } from "./useDashboardControls";
import type { PanelMode } from "./useDashboardControls";
import { useDaySpend } from "./useDaySpend";

import type { HeroView } from "./balanceHero";
import type { Location, RecurringPayment } from "@/types/db";
import type { Movement } from "@/types/ledger";

const PANEL_TITLES: Record<Exclude<PanelMode, "none">, string> = {
  filters: "Filters",
  calendar: "Calendar",
  budget: "Budget",
  add: "Add transaction",
};

export function useMonthDashboard({
  yearMonth,
  movements,
  places,
  reminders,
  today,
  sources,
}: {
  yearMonth: string;
  movements: Movement[];
  places: Location[];
  reminders: RecurringPayment[];
  today: string;
  sources: string[];
}) {
  const settings = useSettings();
  const ratesByDate = useRatesByDate();
  const [selectedYearMonth, setSelectedYearMonth] = useState(yearMonth);

  const todayYearMonth = today.slice(0, 7);
  const oldestYearMonth = useMemo(
    () => oldestYearMonthFrom(movements),
    [movements],
  );
  const newestYearMonth = useMemo(
    () => newestYearMonthFrom(movements),
    [movements],
  );
  const forwardCap = forwardMonthCap(todayYearMonth, newestYearMonth);
  const visibleYearMonth =
    selectedYearMonth > forwardCap ? forwardCap : selectedYearMonth;

  const hasOlder =
    oldestYearMonth !== null &&
    shiftYearMonth(visibleYearMonth, -1) >= oldestYearMonth;
  const hasNewer = visibleYearMonth < forwardCap;

  function shiftMonth(delta: number) {
    setSelectedYearMonth((current) => {
      const next = shiftYearMonth(current, delta);
      if (delta < 0 && oldestYearMonth !== null && next < oldestYearMonth) {
        return current;
      }
      if (delta > 0 && next > forwardCap) return current;
      return next;
    });
  }

  const isCurrentMonth = visibleYearMonth === todayYearMonth;

  function goToCurrentMonth() {
    setSelectedYearMonth(todayYearMonth);
  }

  const c = useDashboardControls({
    yearMonth: visibleYearMonth,
    lifetimeMovements: movements,
    reminders,
    places,
    sources,
  });

  const [view, setView] = useState<HeroView>("monthly");
  const daySpend = useDaySpend({
    yearMonth: visibleYearMonth,
    movements: c.sourceFilteredMonth,
    scope: c.selectedSource,
    today,
    hasOlderMonth: hasOlder,
    hasNewerMonth: hasNewer,
    onShiftMonth: shiftMonth,
  });
  const isDaily = view === "daily";

  const isSelectedToday = daySpend.selectedDate === today;

  function goToToday() {
    setSelectedYearMonth(todayYearMonth);
    daySpend.setSelectedDate(today);
  }

  const filterChoices = useMemo(
    () =>
      listFilterChoices(
        isDaily
          ? c.sourceFilteredMonth.filter(
              onScopedDate(c.selectedSource, daySpend.selectedDate),
            )
          : c.sourceFilteredMonth,
        places,
        { tag: c.selectedTag, place: c.selectedPlace },
      ),
    [
      isDaily,
      c.sourceFilteredMonth,
      c.selectedSource,
      daySpend.selectedDate,
      places,
      c.selectedTag,
      c.selectedPlace,
    ],
  );

  const feedMovements = useMemo(() => {
    if (!isDaily) return c.monthList;
    const onDay = onScopedDate(c.selectedSource, daySpend.selectedDate);
    return c.monthList.filter(
      (movement) => onDay(movement) || hasBudgetMonthOverride(movement),
    );
  }, [isDaily, c.monthList, daySpend.selectedDate, c.selectedSource]);

  const feedMovedOut = useMemo(
    () =>
      isDaily
        ? c.movedOutList.filter(
            onScopedDate(c.selectedSource, daySpend.selectedDate),
          )
        : c.movedOutList,
    [isDaily, c.movedOutList, daySpend.selectedDate, c.selectedSource],
  );

  const addSources = useMemo(
    () =>
      addableSources(
        sources,
        settings.cash_enabled,
        settings.archived_sources ?? [],
      ),
    [sources, settings.cash_enabled, settings.archived_sources],
  );

  const panelOpen = c.panel !== "none";
  const [lastPanel, setLastPanel] =
    useState<Exclude<PanelMode, "none">>("filters");
  if (c.panel !== "none" && c.panel !== lastPanel) {
    setLastPanel(c.panel);
  }
  const [panelMounted, setPanelMounted] = useState(false);
  if (panelOpen && !panelMounted) {
    setPanelMounted(true);
  }
  // Mounting the Drawer already open skips its closed frame, so the enter
  // transition has nothing to animate from and it just pops open. Mount
  // closed, then flip open a tick later once the browser has painted that
  // closed frame.
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    if (!panelMounted) return;
    const raf = requestAnimationFrame(() => setDrawerOpen(panelOpen));
    return () => cancelAnimationFrame(raf);
  }, [panelMounted, panelOpen]);
  const shownPanel = c.panel !== "none" ? c.panel : lastPanel;

  const recurringNotes = useMemo(
    () =>
      detectRecurringNotes(
        movements,
        `${visibleYearMonth}-01`,
        settings.base_currency,
        ratesByDate,
      ),
    [movements, visibleYearMonth, settings.base_currency, ratesByDate],
  );

  return {
    baseCurrency: settings.base_currency,
    visibleYearMonth,
    recurringNotes,
    hasOlder,
    hasNewer,
    shiftMonth,
    onCurrentMonth: isCurrentMonth ? undefined : goToCurrentMonth,
    onToday: isSelectedToday ? undefined : goToToday,
    c,
    view,
    setView,
    daySpend,
    isDaily,
    filterChoices,
    activeFilters: activeListFilterCount(c.selectedTag, c.selectedPlace),
    feedMovements,
    feedMovedOut,
    panelMounted,
    drawerOpen,
    shownPanel,
    panelTitle: PANEL_TITLES[shownPanel],
    addSources,
  };
}
