"use client";

import type { Location, RecurringPayment, Transaction } from "@/types/db";

import { UpcomingBanner } from "@/components/reminders/upcomingBanner";

import { BalanceHero } from "./balanceHero";
import { BudgetPanel } from "./budgetPanel";
import { CalendarPanel } from "./calendarPanel";
import { SpendingBreakdown } from "./spendingBreakdown";
import { DashboardPanel } from "./dashboardPanel";
import { DashboardToolbar } from "./dashboardToolbar";
import { FiltersPanel } from "./filtersPanel";
import { MonthView } from "./monthView";
import { QuickAddForm } from "./quickAddForm";
import { SourceFilter } from "./sourceFilter";
import { useMonthDashboard } from "./useMonthDashboard";

interface Props {
  yearMonth: string;
  lifetimeTransactions: Transaction[];
  sources: string[];
  csvSources: string[];
  places: Location[];
  reminders?: RecurringPayment[];
  completedReminders?: RecurringPayment[];
  today: string;
  recentTags?: string[] | null;
}

export function MonthDashboard({
  yearMonth,
  lifetimeTransactions,
  sources,
  csvSources,
  places,
  reminders = [],
  completedReminders = [],
  today,
  recentTags = null,
}: Props) {
  const {
    baseCurrency,
    visibleYearMonth,
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
  } = useMonthDashboard({
    yearMonth,
    lifetimeTransactions,
    places,
    reminders,
    today,
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="grid min-w-0 gap-5 *:min-w-0">
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
          includeTransfers={c.includeTransfers}
          selectedKind={c.selectedKind}
          onKindChange={c.setSelectedKind}
          hasOlder={hasOlder}
          hasNewer={hasNewer}
          onShiftMonth={shiftMonth}
          view={view}
          onViewChange={setView}
          daySpend={daySpend}
        />
        <SourceFilter
          sources={sources}
          csvSources={csvSources}
          selected={c.selectedSource}
          onChange={c.setSelectedSource}
        />
        {c.showQuickAdd && recentTags && (
          <QuickAddForm recentTags={recentTags} source={c.selectedSource} />
        )}
        <SpendingBreakdown
          transactions={breakdownTransactions}
          places={places}
          selectedTag={c.selectedTag}
          onSelectTag={c.setSelectedTag}
          selectedPlace={c.selectedPlace}
          onSelectPlace={c.setSelectedPlace}
          limit={4}
          moreHref="/dashboard"
        />
        <div className="min-h-[100svh]">
          <MonthView
            transactions={feedTransactions}
            movedOut={feedMovedOut}
            includeTransfers={c.includeTransfers}
            emptyLabel={
              isDaily
                ? "No transactions this day."
                : "No transactions this month."
            }
          />
        </div>
      </div>

      {panelMounted && (
        <DashboardPanel
          title={
            shownPanel === "filters"
              ? "Filters"
              : shownPanel === "calendar"
                ? "Calendar"
                : "Budget"
          }
          open={drawerOpen}
          onClose={c.closePanel}
          panelKey={shownPanel}
        >
          {shownPanel === "filters" ? (
            <FiltersPanel
              baseCurrency={baseCurrency}
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
              includeTransfers={c.includeTransfers}
            />
          ) : shownPanel === "calendar" ? (
            <CalendarPanel
              open={drawerOpen}
              yearMonth={visibleYearMonth}
              activityDates={c.activityDates}
              reminderDates={c.reminderDates}
              selectedDay={c.selectedDay}
              selectedDayGroup={c.selectedDayGroup}
              onSelectDay={c.setSelectedDay}
              reminders={reminders}
              completedReminders={completedReminders}
              today={c.today}
            />
          ) : (
            <BudgetPanel />
          )}
        </DashboardPanel>
      )}
    </div>
  );
}
