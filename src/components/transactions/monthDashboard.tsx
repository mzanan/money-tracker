"use client";

import { useState } from "react";

import { usePresence } from "@/hooks/usePresence";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

import type { RecurringPayment, Transaction } from "@/types/db";

import { BalanceHero } from "./balanceHero";
import { CalendarPanel } from "./calendarPanel";
import { DashboardPanel } from "./dashboardPanel";
import { DashboardToolbar } from "./dashboardToolbar";
import { FiltersPanel } from "./filtersPanel";
import { MonthView } from "./monthView";
import { SourcePills } from "./sourcePills";
import { useDashboardControls } from "./useDashboardControls";

interface Props {
  yearMonth: string;
  monthTransactions: Transaction[];
  lifetimeTransactions: Transaction[];
  sources: string[];
  reminders?: RecurringPayment[];
  today: string;
  quickAdd?: React.ReactNode;
  nav?: React.ReactNode;
  banner?: React.ReactNode;
}

export function MonthDashboard({
  yearMonth,
  monthTransactions,
  lifetimeTransactions,
  sources,
  reminders = [],
  today,
  quickAdd,
  nav,
  banner,
}: Props) {
  const settings = useSettings();
  const c = useDashboardControls({
    monthTransactions,
    lifetimeTransactions,
    reminders,
  });

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
        {banner}
        <DashboardToolbar panel={c.panel} onToggle={c.togglePanel} />
        <BalanceHero
          yearMonth={yearMonth}
          transactions={c.sourceFilteredMonth}
          lifetimeTransactions={c.sourceFilteredLifetime}
          selectedKind={c.selectedKind}
          onKindChange={c.setSelectedKind}
          today={today}
          nav={nav}
        />
        {c.showQuickAdd && quickAdd}
        <SourcePills
          sources={sources}
          selected={c.selectedSource}
          onChange={c.setSelectedSource}
        />
        <MonthView transactions={c.monthList} />
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
              yearMonth={yearMonth}
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
