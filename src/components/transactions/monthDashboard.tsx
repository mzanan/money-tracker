"use client";

import { useMemo, useState } from "react";

import { usePresence } from "@/hooks/usePresence";
import { useSettings } from "@/hooks/useSettings";
import {
  monthBounds,
  oldestYearMonthFrom,
  shiftYearMonth,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { Location, RecurringPayment, Transaction } from "@/types/db";

import { UpcomingBanner } from "@/components/reminders/upcomingBanner";

import { BalanceHero } from "./balanceHero";
import { CalendarPanel } from "./calendarPanel";
import { SpendingBreakdown } from "./spendingBreakdown";
import { DashboardPanel } from "./dashboardPanel";
import { DashboardToolbar } from "./dashboardToolbar";
import { FiltersPanel } from "./filtersPanel";
import { MonthView } from "./monthView";
import { SourceFilter } from "./sourceFilter";
import { useDashboardControls } from "./useDashboardControls";
import { useDaySpend } from "./useDaySpend";

import type { HeroView } from "./balanceHero";

interface Props {
  yearMonth: string;
  lifetimeTransactions: Transaction[];
  sources: string[];
  places: Location[];
  reminders?: RecurringPayment[];
  today: string;
  quickAdd?: React.ReactNode;
}

export function MonthDashboard({
  yearMonth: initialYearMonth,
  lifetimeTransactions,
  sources,
  places,
  reminders = [],
  today,
  quickAdd,
}: Props) {
  const settings = useSettings();
  const [visibleYearMonth, setVisibleYearMonth] = useState(initialYearMonth);

  const monthTransactions = useMemo(() => {
    const [start, end] = monthBounds(visibleYearMonth);
    return lifetimeTransactions
      .filter((tx) => tx.occurred_on >= start && tx.occurred_on <= end)
      .slice()
      .sort((a, b) => {
        if (a.occurred_on !== b.occurred_on) {
          return a.occurred_on < b.occurred_on ? 1 : -1;
        }
        return (a.occurred_at ?? "") < (b.occurred_at ?? "") ? 1 : -1;
      });
  }, [lifetimeTransactions, visibleYearMonth]);

  const todayYearMonth = today.slice(0, 7);
  const oldestYearMonth = useMemo(
    () => oldestYearMonthFrom(lifetimeTransactions),
    [lifetimeTransactions],
  );
  const hasOlder =
    oldestYearMonth !== null &&
    shiftYearMonth(visibleYearMonth, -1) >= oldestYearMonth;
  const hasNewer = visibleYearMonth < todayYearMonth;

  function shiftMonth(delta: number) {
    setVisibleYearMonth((current) => {
      const next = shiftYearMonth(current, delta);
      if (delta < 0 && oldestYearMonth !== null && next < oldestYearMonth) {
        return current;
      }
      if (delta > 0 && next > todayYearMonth) return current;
      return next;
    });
  }

  const c = useDashboardControls({
    monthTransactions,
    lifetimeTransactions,
    reminders,
    places,
  });

  const [view, setView] = useState<HeroView>("monthly");
  const daySpend = useDaySpend({
    yearMonth: visibleYearMonth,
    transactions: c.sourceFilteredMonth,
    today,
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
        ? c.monthList.filter((tx) => tx.occurred_on === daySpend.selectedDate)
        : c.monthList,
    [isDaily, c.monthList, daySpend.selectedDate],
  );

  const panelOpen = c.panel !== "none";
  const panel = usePresence(panelOpen);
  const [lastPanel, setLastPanel] = useState<"filters" | "calendar">("filters");
  if (c.panel !== "none" && c.panel !== lastPanel) {
    setLastPanel(c.panel);
  }
  const shownPanel = c.panel !== "none" ? c.panel : lastPanel;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-xl",
        panel.rendered &&
          "lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,34rem)_minmax(0,24rem)] lg:items-start lg:gap-5",
      )}
    >
      <div className="grid gap-5">
        <UpcomingBanner
          reminders={reminders}
          today={today}
          onOpen={() => c.openPanel("calendar")}
        />
        <DashboardToolbar panel={c.panel} onToggle={c.togglePanel} />
        <BalanceHero
          yearMonth={visibleYearMonth}
          transactions={c.sourceFilteredMonth}
          lifetimeTransactions={c.sourceFilteredLifetime}
          selectedKind={c.selectedKind}
          onKindChange={c.setSelectedKind}
          today={today}
          hasOlder={hasOlder}
          hasNewer={hasNewer}
          onShiftMonth={shiftMonth}
          view={view}
          onViewChange={setView}
          daySpend={daySpend}
        />
        {c.showQuickAdd && quickAdd}
        <SourceFilter
          sources={sources}
          selected={c.selectedSource}
          onChange={c.setSelectedSource}
        />
        <SpendingBreakdown
          transactions={breakdownTransactions}
          places={places}
          selectedCategory={c.selectedCategory}
          onSelectCategory={c.setSelectedCategory}
          selectedPlace={c.selectedPlace}
          onSelectPlace={c.setSelectedPlace}
        />
        <MonthView
          transactions={feedTransactions}
          emptyLabel={
            isDaily ? "No transactions this day." : "No transactions this month."
          }
        />
      </div>

      {panel.rendered && (
        <DashboardPanel
          title={shownPanel === "filters" ? "Filters" : "Calendar"}
          state={panel.state}
          onClose={c.closePanel}
        >
          {shownPanel === "filters" ? (
            <FiltersPanel
              baseCurrency={settings.base_currency}
              minInput={c.minInput}
              setMinInput={c.setMinInput}
              maxInput={c.maxInput}
              setMaxInput={c.setMaxInput}
              scope={c.scope}
              setScope={c.setScope}
              onClear={() => {
                c.setMinInput("");
                c.setMaxInput("");
              }}
              amountActive={c.amountActive}
              results={c.filterResults}
            />
          ) : (
            <CalendarPanel
              yearMonth={visibleYearMonth}
              activityDates={c.activityDates}
              reminderDates={c.reminderDates}
              selectedDay={c.selectedDay}
              selectedDayGroup={c.selectedDayGroup}
              onSelectDay={c.setSelectedDay}
              reminders={reminders}
              today={c.today}
            />
          )}
        </DashboardPanel>
      )}
    </div>
  );
}
