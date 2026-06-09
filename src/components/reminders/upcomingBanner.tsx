"use client";

import { BellRingIcon, ChevronRightIcon } from "lucide-react";

import { daysBetween, dueLabel, dueSoon } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import type { RecurringPayment } from "@/types/db";

export function UpcomingBanner({
  reminders,
  today,
  onOpen,
  withinDays = 7,
}: {
  reminders: RecurringPayment[];
  today: string;
  onOpen: () => void;
  withinDays?: number;
}) {
  const soon = dueSoon(reminders, today, withinDays);

  if (soon.length === 0) return null;

  const overdue = soon.some((r) => daysBetween(today, r.next_due_on) < 0);
  const next = soon[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
        overdue
          ? "bg-destructive/10 hover:bg-destructive/15"
          : "bg-primary/10 hover:bg-primary/15",
      )}
    >
      <BellRingIcon
        className={cn(
          "size-5 shrink-0",
          overdue ? "text-destructive" : "text-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {soon.length === 1
            ? next.label
            : `${soon.length} payments due soon`}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {next.label} · {dueLabel(next.next_due_on, today)}
        </p>
      </div>
      <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
    </button>
  );
}
