"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parse } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Reveal } from "@/components/ui/reveal";
import { Surface } from "@/components/ui/surface";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompletedReminderRow } from "@/components/reminders/completedReminderRow";
import { ReminderRow } from "@/components/reminders/reminderRow";
import { formatYearMonthLong, monthBounds } from "@/lib/dates";

import type { DayTotalsWithPairs } from "@/lib/cancellations";
import type { RecurringPayment } from "@/types/db";

import { DaySection } from "./daySection";
import { PayCandidatesPanel } from "./payCandidatesPanel";
import { TransactionFormDialog } from "./transactionFormDialog";
import { usePayFlow } from "./usePayFlow";

const ymd = (date: Date) => format(date, "yyyy-MM-dd");
const ym = (date: Date) => format(date, "yyyy-MM");

type ReminderScope = "month" | "all" | "done";

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
  const defaultMonth = parse(`${yearMonth}-01`, "yyyy-MM-dd", new Date());
  const selected = selectedDay
    ? parse(selectedDay, "yyyy-MM-dd", new Date())
    : undefined;

  const [visibleMonth, setVisibleMonth] = useState<Date>(defaultMonth);
  const [reminderScope, setReminderScope] = useState<ReminderScope>("month");
  const visibleYearMonth = ym(visibleMonth);
  const payFlow = usePayFlow(today);

  useEffect(() => {
    if (!open) payFlow.close();
  }, [open, payFlow]);

  const [shownDay, setShownDay] = useState<DayTotalsWithPairs | null>(
    selectedDayGroup,
  );
  if (selectedDayGroup && selectedDayGroup !== shownDay) {
    setShownDay(selectedDayGroup);
  }

  const shownReminders = useMemo(() => {
    if (reminderScope === "done") return completedReminders;
    const sorted = [...reminders].sort((a, b) =>
      a.next_due_on.localeCompare(b.next_due_on),
    );
    if (reminderScope === "all") return sorted;
    const [start, end] = monthBounds(visibleYearMonth);
    return sorted.filter((r) => r.next_due_on >= start && r.next_due_on <= end);
  }, [reminders, completedReminders, reminderScope, visibleYearMonth]);

  return (
    <>
      {payFlow.activeReminder ? (
        <Surface className="grid gap-4">
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
                onSelect={(date) => onSelectDay(date ? ymd(date) : null)}
                modifiers={{
                  hasTx: (date) => activityDates.has(ymd(date)),
                  due: (date) => reminderDates.has(ymd(date)),
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
                onValueChange={(v) => setReminderScope(v as ReminderScope)}
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

      {payFlow.addExpenseMounted &&
        payFlow.activeReminder &&
        payFlow.activeReminder.amount != null && (
          <TransactionFormDialog
            key={payFlow.addExpenseKey}
            seed={{
              kind: "expense",
              amount: payFlow.activeReminder.amount,
              currency: payFlow.activeReminder.currency ?? "USD",
              source: payFlow.activeReminder.source ?? "manual",
              note: payFlow.activeReminder.label,
              tags: [],
              occurredOn: payFlow.payDay,
            }}
            open={payFlow.addExpenseOpen}
            onOpenChange={payFlow.setAddExpenseOpen}
            title={`Pay ${payFlow.activeReminder.label}`}
            description="Review the expense before saving. It will be linked to this reminder."
            submitLabel="Save and mark paid"
            onCreated={payFlow.handleExpenseCreated}
          />
        )}
    </>
  );
}
