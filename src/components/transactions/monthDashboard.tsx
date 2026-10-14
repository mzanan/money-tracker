"use client";

import type { EntrySuggestion } from "@/lib/entrySuggestions";
import type { Location, RecurringPayment } from "@/types/db";
import type { Movement } from "@/types/ledger";

import { UpcomingBanner } from "@/components/reminders/upcomingBanner";

import { AddEntryFab } from "./addEntryFab";
import { AddEntryPanel } from "./addEntryPanel";
import { BalanceHero } from "./balanceHero";
import { BudgetPanel } from "./budgetPanel";
import { CalendarPanel } from "./calendarPanel";
import { DashboardPanel } from "./dashboardPanel";
import { DashboardToolbar } from "./dashboardToolbar";
import { FiltersPanel } from "./filtersPanel";
import { MonthView } from "./monthView";
import { SourceFilter } from "./sourceFilter";
import { TransitBanner } from "./transitBanner";
import { TransitPanel } from "./transitPanel";
import { useDayTotalsCurrency } from "./useDayTotalsCurrency";
import { useMonthDashboard } from "./useMonthDashboard";

interface Props {
  yearMonth: string;
  movements: Movement[];
  sources: string[];
  csvSources: string[];
  withdrawalSources: string[];
  places: Location[];
  reminders?: RecurringPayment[];
  completedReminders?: RecurringPayment[];
  today: string;
  recentTags?: string[] | null;
  entrySuggestions?: EntrySuggestion[];
}

export function MonthDashboard({
  yearMonth,
  movements,
  sources,
  csvSources,
  withdrawalSources,
  places,
  reminders = [],
  completedReminders = [],
  today,
  recentTags = null,
  entrySuggestions = [],
}: Props) {
  const {
    baseCurrency,
    visibleYearMonth,
    hasOlder,
    hasNewer,
    shiftMonth,
    onCurrentMonth,
    onToday,
    c,
    view,
    setView,
    daySpend,
    isDaily,
    filterChoices,
    activeFilters,
    feedMovements,
    feedMovedOut,
    panelMounted,
    drawerOpen,
    shownPanel,
    recurringNotes,
    inTransit,
    panelTitle,
    addSources,
  } = useMonthDashboard({
    yearMonth,
    movements,
    places,
    reminders,
    today,
    sources,
  });
  const dayTotalsCurrency = useDayTotalsCurrency(
    c.selectedSource,
    feedMovements,
  );

  return (
    <div className="mx-auto w-full max-w-xl pb-20 lg:pb-0">
      <div className="grid min-w-0 gap-5 *:min-w-0">
        <UpcomingBanner
          reminders={reminders}
          today={today}
          onOpen={() => c.openPanel("calendar")}
        />
        <TransitBanner
          movements={inTransit}
          onOpen={() => c.openPanel("transit")}
        />
        <DashboardToolbar
          panel={c.panel}
          onToggle={c.togglePanel}
          activeFilters={activeFilters}
        />
        <BalanceHero
          yearMonth={visibleYearMonth}
          movements={c.sourceFilteredMonth}
          lifetimeMovements={c.sourceFilteredLifetime}
          pendingMovements={inTransit}
          scope={c.selectedSource}
          selectedKind={c.selectedKind}
          onKindChange={c.setSelectedKind}
          hasOlder={hasOlder}
          hasNewer={hasNewer}
          onShiftMonth={shiftMonth}
          onCurrentMonth={onCurrentMonth}
          onToday={onToday}
          view={view}
          onViewChange={setView}
          daySpend={daySpend}
        />
        <div className="grid min-h-[calc(100svh-var(--spacing-header))] min-w-0 content-start gap-5 *:min-w-0">
          <SourceFilter
            sources={sources}
            csvSources={csvSources}
            withdrawalSources={withdrawalSources}
            selected={c.selectedSource}
            onChange={c.setSelectedSource}
          />
          <MonthView
            movements={feedMovements}
            dayTotalsCurrency={dayTotalsCurrency}
            movedOut={feedMovedOut}
            scope={c.selectedSource}
            recurringNotes={recurringNotes}
            emptyLabel={
              activeFilters > 0
                ? "No transactions match these filters."
                : isDaily
                  ? "No transactions this day."
                  : "No transactions this month."
            }
          />
        </div>
      </div>

      {panelMounted && (
        <DashboardPanel
          title={panelTitle}
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
                c.setSelectedTag(null);
                c.setSelectedPlace(null);
              }}
              tagOptions={filterChoices.tags}
              selectedTag={c.selectedTag}
              onSelectTag={c.setSelectedTag}
              placeOptions={filterChoices.places}
              selectedPlace={c.selectedPlace}
              onSelectPlace={c.setSelectedPlace}
              amountActive={c.amountActive}
              results={c.filterResults}
              movementScope={c.selectedSource}
            />
          ) : shownPanel === "calendar" ? (
            <CalendarPanel
              open={drawerOpen}
              yearMonth={visibleYearMonth}
              activityDates={c.activityDates}
              reminderDates={c.reminderDates}
              selectedDay={c.selectedDay}
              selectedDayGroup={c.selectedDayGroup}
              selectedDayCurrency={c.selectedDayCurrency}
              onSelectDay={c.setSelectedDay}
              reminders={reminders}
              completedReminders={completedReminders}
              today={c.today}
            />
          ) : shownPanel === "transit" ? (
            <TransitPanel movements={inTransit} />
          ) : shownPanel === "add" ? (
            <AddEntryPanel
              addSources={addSources}
              selectedSource={c.selectedSource}
              recentTags={recentTags ?? []}
              entrySuggestions={entrySuggestions}
              onAdded={c.closePanel}
            />
          ) : (
            <BudgetPanel />
          )}
        </DashboardPanel>
      )}

      {addSources.length > 0 && (
        <AddEntryFab onClick={() => c.openPanel("add")} />
      )}
    </div>
  );
}
