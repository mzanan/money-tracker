"use client";

import { BellRingIcon } from "lucide-react";

import { NoticeBanner } from "@/components/ui/noticeBanner";
import { daysBetween, dueLabel, dueSoon } from "@/lib/reminders";
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
    <NoticeBanner
      icon={BellRingIcon}
      tone={overdue ? "destructive" : "primary"}
      title={
        soon.length === 1 ? next.label : `${soon.length} payments due soon`
      }
      detail={`${next.label} · ${dueLabel(next.next_due_on, today)}`}
      onClick={onOpen}
    />
  );
}
