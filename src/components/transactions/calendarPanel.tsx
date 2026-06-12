"use client";

import { useMemo, useState } from "react";
import { format, parse } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Reveal } from "@/components/ui/reveal";
import { Surface } from "@/components/ui/surface";
import { ReminderRow } from "@/components/reminders/reminderRow";
import { formatYearMonthLong, monthBounds } from "@/lib/dates";

import type { DayTotals } from "@/lib/totals";
import type { RecurringPayment } from "@/types/db";

import { DaySection } from "./daySection";

const ymd = (date: Date) => format(date, "yyyy-MM-dd");
const ym = (date: Date) => format(date, "yyyy-MM");

export function CalendarPanel({
  yearMonth,
  activityDates,
  reminderDates,
  selectedDay,
  selectedDayGroup,
  onSelectDay,
  reminders,
  today,
}: {
  yearMonth: string;
  activityDates: Set<string>;
  reminderDates: Set<string>;
  selectedDay: string | null;
  selectedDayGroup: DayTotals | null;
  onSelectDay: (day: string | null) => void;
  reminders: RecurringPayment[];
  today: string;
}) {
  const defaultMonth = parse(`${yearMonth}-01`, "yyyy-MM-dd", new Date());
  const selected = selectedDay
    ? parse(selectedDay, "yyyy-MM-dd", new Date())
    : undefined;

  const [visibleMonth, setVisibleMonth] = useState<Date>(defaultMonth);
  const visibleYearMonth = ym(visibleMonth);

  const [shownDay, setShownDay] = useState<DayTotals | null>(selectedDayGroup);
  if (selectedDayGroup && selectedDayGroup !== shownDay) {
    setShownDay(selectedDayGroup);
  }

  const visibleReminders = useMemo(() => {
    const [start, end] = monthBounds(visibleYearMonth);
    return reminders
      .filter((r) => r.next_due_on >= start && r.next_due_on <= end)
      .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  }, [reminders, visibleYearMonth]);

  return (
    <>
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
            modifiersClassNames={{
              hasTx:
                "after:bg-muted-foreground after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-[calc(100%+1px)] after:rounded-full",
              due: "before:bg-amber-500 before:absolute before:bottom-1 before:left-1/2 before:size-1 before:translate-x-[1px] before:rounded-full",
            }}
          />
        </div>

        <div className="text-muted-foreground flex items-center justify-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="bg-muted-foreground size-1.5 rounded-full" />
            Movements
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-amber-500 size-1.5 rounded-full" />
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
        <span className="text-eyebrow">
          Due · {formatYearMonthLong(visibleYearMonth)}
        </span>
        {visibleReminders.length > 0 ? (
          <ul className="grid gap-1">
            {visibleReminders.map((reminder) => (
              <ReminderRow key={reminder.id} reminder={reminder} today={today} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nothing due this month.
          </p>
        )}
      </Surface>
    </>
  );
}
