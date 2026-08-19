"use client";

import { Calendar } from "@/components/ui/calendar";
import { Reveal } from "@/components/ui/reveal";
import { Surface } from "@/components/ui/surface";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompletedReminderRow } from "@/components/reminders/completedReminderRow";
import { ReminderRow } from "@/components/reminders/reminderRow";
import { formatYearMonthLong, formatYmd } from "@/lib/dates";

import type { DayTotalsWithPairs } from "@/lib/cancellations";
import type { RecurringPayment } from "@/types/db";

import { DaySection } from "./daySection";
import { PayCandidatesPanel } from "./payCandidatesPanel";
import { PayExpensePanel } from "./payExpensePanel";
import { useCalendarPanel } from "./useCalendarPanel";

export function CalendarPanel({
  open,
  yearMonth,
  activityDates,
  reminderDates,
  selectedDay,
  selectedDayGroup,
  onSelectDay,
  reminders,
  completedReminders,
  today,
}: {
  open: boolean;
  yearMonth: string;
  activityDates: Set<string>;
  reminderDates: Set<string>;
  selectedDay: string | null;
  selectedDayGroup: DayTotalsWithPairs | null;
  onSelectDay: (day: string | null) => void;
  reminders: RecurringPayment[];
  completedReminders: RecurringPayment[];
  today: string;
}) {
  const {
    selected,
    visibleMonth,
    setVisibleMonth,
    reminderScope,
    setReminderScope,
    visibleYearMonth,
    payFlow,
    shownDay,
    shownReminders,
  } = useCalendarPanel({
    open,
    yearMonth,
    selectedDay,
    selectedDayGroup,
    reminders,
    completedReminders,
    today,
  });

  return (
    <>
      {payFlow.activeReminder ? (
        <Surface className="grid min-w-0 gap-4">
          {payFlow.step === "form" && payFlow.activeReminder.amount != null ? (
            <PayExpensePanel
              reminderLabel={payFlow.activeReminder.label}
              seed={{
                kind: "expense",
                amount: payFlow.activeReminder.amount,
                currency: payFlow.activeReminder.currency ?? "USD",
                source: payFlow.activeReminder.source ?? "manual",
                note: payFlow.activeReminder.label,
                tags: [],
                occurredOn: payFlow.payDay,
              }}
              onBack={payFlow.backToCandidates}
              onCreated={payFlow.handleExpenseCreated}
            />
          ) : (
            <PayCandidatesPanel
              reminder={payFlow.activeReminder}
              today={today}
              day={payFlow.payDay}
              loading={payFlow.checking}
              suggested={payFlow.payOptions?.suggested ?? []}
              recent={payFlow.payOptions?.recent ?? []}
              onChooseDay={payFlow.choosePayDay}
              onLink={(transactionId) => payFlow.confirmPaid(transactionId)}
              onCreate={payFlow.openAddExpense}
              onSkip={payFlow.markPaidOnly}
              onBack={payFlow.close}
            />
          )}
        </Surface>
      ) : (
        <div className="grid gap-5">
          <Surface className="grid gap-3">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                className="bg-transparent"
                month={visibleMonth}
                onMonthChange={setVisibleMonth}
                selected={selected}
                onSelect={(date) => onSelectDay(date ? formatYmd(date) : null)}
                modifiers={{
                  hasTx: (date) => activityDates.has(formatYmd(date)),
                  due: (date) => reminderDates.has(formatYmd(date)),
                }}
              />
            </div>

            <div className="text-muted-foreground text-caption flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="bg-muted-foreground size-1.5 rounded-full" />
                Movements
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-warning size-1.5 rounded-full" />
                Reminder
              </span>
            </div>
          </Surface>

          <Reveal open={Boolean(selectedDayGroup)}>
            {shownDay && (
              <DaySection day={shownDay} onClose={() => onSelectDay(null)} />
            )}
          </Reveal>

          <Surface className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-eyebrow">
                {reminderScope === "month"
                  ? `Due · ${formatYearMonthLong(visibleYearMonth)}`
                  : reminderScope === "all"
                    ? "Upcoming"
                    : "Completed"}
              </span>
              <Tabs
                value={reminderScope}
                onValueChange={(v) => setReminderScope(v as typeof reminderScope)}
              >
                <TabsList>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="done">Done</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {shownReminders.length > 0 ? (
              <ul className="grid gap-1">
                {shownReminders.map((reminder) =>
                  reminderScope === "done" ? (
                    <CompletedReminderRow
                      key={reminder.id}
                      reminder={reminder}
                    />
                  ) : (
                    <ReminderRow
                      key={reminder.id}
                      reminder={reminder}
                      today={today}
                      onMarkPaid={() => payFlow.start(reminder)}
                      anyPayPending={payFlow.pending}
                      paySubmitting={
                        payFlow.pending &&
                        payFlow.pendingReminderId === reminder.id
                      }
                    />
                  ),
                )}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                {reminderScope === "month"
                  ? "Nothing due this month."
                  : reminderScope === "all"
                    ? "No reminders yet."
                    : "No completed reminders yet."}
              </p>
            )}
          </Surface>
        </div>
      )}
    </>
  );
}
