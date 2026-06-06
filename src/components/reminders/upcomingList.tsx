"use client";

import { useState } from "react";
import { BellPlusIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

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
  const [showLater, setShowLater] = useState(false);

  const currentMonth = today.slice(0, 7);
  const soon = reminders.filter(
    (r) => r.next_due_on.slice(0, 7) <= currentMonth,
  );
  const later = reminders.filter(
    (r) => r.next_due_on.slice(0, 7) > currentMonth,
  );

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Upcoming payments</h1>
          <p className="text-muted-foreground text-sm">
            Due this month or overdue.
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
      ) : soon.length === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          Nothing due this month.
        </div>
      ) : (
        <ul className="grid gap-1">
          {soon.map((r) => (
            <ReminderRow key={r.id} reminder={r} today={today} />
          ))}
        </ul>
      )}

      {later.length > 0 && (
        <div className="grid gap-1">
          <button
            type="button"
            onClick={() => setShowLater((v) => !v)}
            className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-medium transition-colors"
          >
            {showLater ? <ChevronUpIcon /> : <ChevronDownIcon />}
            {showLater ? "Hide" : "Show"} {later.length} later reminder
            {later.length === 1 ? "" : "s"}
          </button>
          {showLater && (
            <ul className="grid gap-1">
              {later.map((r) => (
                <ReminderRow key={r.id} reminder={r} today={today} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
