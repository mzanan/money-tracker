"use client";

import { BellPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ReminderForm } from "./reminderForm";
import { ReminderRow } from "./reminderRow";

import type { RecurringPayment } from "@/types/db";

export function UpcomingList({
  reminders,
  today,
}: {
  reminders: RecurringPayment[];
  today: string;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Upcoming payments</h1>
          <p className="text-muted-foreground text-sm">
            Recurring payments and when each is next due.
          </p>
        </div>
        <ReminderForm
          trigger={
            <Button size="sm" className="shrink-0">
              <BellPlusIcon />
              Add
            </Button>
          }
        />
      </div>

      {reminders.length === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No reminders yet. Add one, or set a reminder from any transaction.
        </div>
      ) : (
        <ul className="grid gap-1">
          {reminders.map((r) => (
            <ReminderRow key={r.id} reminder={r} today={today} />
          ))}
        </ul>
      )}
    </div>
  );
}
