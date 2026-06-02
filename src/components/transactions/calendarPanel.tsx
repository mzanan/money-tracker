"use client";

import { useState } from "react";
import { format, parse } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Reveal } from "@/components/ui/reveal";
import { Surface } from "@/components/ui/surface";
import { ReminderRow } from "@/components/reminders/reminderRow";
import { formatYearMonthLong } from "@/lib/dates";

import type { DayTotals } from "@/lib/totals";
import type { RecurringPayment } from "@/types/db";

import { DaySection } from "./daySection";

const ymd = (date: Date) => format(date, "yyyy-MM-dd");

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

  const [shownDay, setShownDay] = useState<DayTotals | null>(selectedDayGroup);
  if (selectedDayGroup && selectedDayGroup !== shownDay) {
    setShownDay(selectedDayGroup);
  }

  return (
    <>
      <Surface className="grid gap-3">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            className="bg-transparent"
            defaultMonth={defaultMonth}
            selected={selected}
            onSelect={(date) => onSelectDay(date ? ymd(date) : null)}
            modifiers={{
              hasTx: (date) => activityDates.has(ymd(date)),
              due: (date) => reminderDates.has(ymd(date)),
            }}
            modifiersClassNames={{
              hasTx:
                "after:bg-muted-foreground after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full",
              due: "before:bg-primary before:absolute before:top-1 before:right-1 before:size-1.5 before:rounded-full",
            }}
          />
        </div>

        <div className="text-muted-foreground flex items-center justify-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="bg-muted-foreground size-1.5 rounded-full" />
            Movements
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-primary size-1.5 rounded-full" />
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
          Due · {formatYearMonthLong(yearMonth)}
        </span>
        {reminders.length > 0 ? (
          <ul className="grid gap-1">
            {reminders.map((reminder) => (
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
