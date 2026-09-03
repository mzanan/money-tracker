"use client";

import { useEffect, useMemo, useState } from "react";

import { useSettings } from "@/hooks/useSettings";
import { hasBudgetMonthOverride } from "@/lib/budgetMonth";
import { detectRecurringNotes } from "@/lib/unusualExpenses";
import {
  effectiveYearMonth,
  forwardMonthCap,
  newestYearMonthFrom,
  oldestYearMonthFrom,
  shiftYearMonth,
} from "@/lib/dates";

import { useDashboardControls } from "./useDashboardControls";
import type { PanelMode } from "./useDashboardControls";
import { useDaySpend } from "./useDaySpend";

import type { HeroView } from "./balanceHero";
import type { Location, RecurringPayment, Transaction } from "@/types/db";

export function useMonthDashboard({
  yearMonth,
  lifetimeTransactions,
  places,
  reminders,
  today,
}: {
  yearMonth: string;
  lifetimeTransactions: Transaction[];
  places: Location[];
  reminders: RecurringPayment[];
  today: string;
}) {
  const settings = useSettings();
  const [selectedYearMonth, setSelectedYearMonth] = useState(yearMonth);

  const todayYearMonth = today.slice(0, 7);
  const oldestYearMonth = useMemo(
    () => oldestYearMonthFrom(lifetimeTransactions),
    [lifetimeTransactions],
  );
  const newestYearMonth = useMemo(
    () => newestYearMonthFrom(lifetimeTransactions),
    [lifetimeTransactions],
  );
  const forwardCap = forwardMonthCap(todayYearMonth, newestYearMonth);
  const visibleYearMonth =
    selectedYearMonth > forwardCap ? forwardCap : selectedYearMonth;

  const monthTransactions = useMemo(() => {
    return lifetimeTransactions
      .filter((tx) => effectiveYearMonth(tx) === visibleYearMonth)
      .slice()
      .sort((a, b) => {
        if (a.occurred_on !== b.occurred_on) {
          return a.occurred_on < b.occurred_on ? 1 : -1;
        }
        return (a.occurred_at ?? "") < (b.occurred_at ?? "") ? 1 : -1;
      });
  }, [lifetimeTransactions, visibleYearMonth]);

  const monthMovedOut = useMemo(
    () =>
      lifetimeTransactions.filter(
        (tx) =>
          tx.occurred_on.slice(0, 7) === visibleYearMonth &&
          hasBudgetMonthOverride(tx),
      ),
    [lifetimeTransactions, visibleYearMonth],
  );

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

  const c = useDashboardControls({
    monthTransactions,
    monthMovedOut,
    lifetimeTransactions,
    reminders,
    places,
  });

  const [view, setView] = useState<HeroView>("monthly");
  const daySpend = useDaySpend({
    yearMonth: visibleYearMonth,
    transactions: c.sourceFilteredMonth,
    today,
    includeTransfers: c.includeTransfers,
  });
  const isDaily = view === "daily";

  const breakdownTransactions = useMemo(
    () =>
      isDaily
        ? c.sourceFilteredMonth.filter(
            (tx) => tx.occurred_on === daySpend.selectedDate,
          )
        : c.sourceFilteredMonth,
    [isDaily, c.sourceFilteredMonth, daySpend.selectedDate],
  );

  const feedTransactions = useMemo(
    () =>
      isDaily
        ? c.monthList.filter(
            (tx) =>
              tx.occurred_on === daySpend.selectedDate ||
              hasBudgetMonthOverride(tx),
          )
        : c.monthList,
    [isDaily, c.monthList, daySpend.selectedDate],
  );

  const feedMovedOut = useMemo(
    () =>
      isDaily
        ? c.movedOutList.filter(
            (tx) => tx.occurred_on === daySpend.selectedDate,
          )
        : c.movedOutList,
    [isDaily, c.movedOutList, daySpend.selectedDate],
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
        lifetimeTransactions,
        `${visibleYearMonth}-01`,
        settings.base_currency,
      ),
    [lifetimeTransactions, visibleYearMonth, settings.base_currency],
  );

  return {
    baseCurrency: settings.base_currency,
    visibleYearMonth,
    recurringNotes,
    hasOlder,
    hasNewer,
    shiftMonth,
    c,
    view,
    setView,
    daySpend,
    isDaily,
    breakdownTransactions,
    feedTransactions,
    feedMovedOut,
    panelMounted,
    drawerOpen,
    shownPanel,
  };
}
