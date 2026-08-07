"use client";

import { useState } from "react";
import { format } from "date-fns";

import { labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { daysBefore, formatDateShort, formatDayLong } from "@/lib/dates";
import type { ReminderPaymentCandidate } from "@/lib/actions/reminders";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";

function ymd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toDate(day: string): Date {
  return new Date(`${day}T00:00:00`);
}

function CandidateButton({
  match,
  onClick,
}: {
  match: ReminderPaymentCandidate;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-surface-2/60 border-border flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {labelForSource(match.source)}
          {match.note ? ` · ${match.note}` : ""}
        </span>
        <span className="text-muted-foreground block text-xs">
          {formatDateShort(match.occurredOn)} · links the reminder, no new
          expense
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        -{formatMoney(match.amount, match.currency)}
      </span>
    </button>
  );
}

function CandidateSkeleton() {
  return (
    <div className="border-border grid gap-2 rounded-2xl border px-4 py-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function PayCandidatesDrawer({
  open,
  label,
  today,
  hasAmount,
  day,
  loading,
  suggested,
  recent,
  onChooseDay,
  onLink,
  onCreate,
  onSkip,
  onClose,
}: {
  open: boolean;
  label: string;
  today: string;
  hasAmount: boolean;
  day: string;
  loading: boolean;
  suggested: ReminderPaymentCandidate[];
  recent: ReminderPaymentCandidate[];
  onChooseDay: (day: string) => void;
  onLink: (transactionId: string) => void;
  onCreate: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(() => toDate(day));
  const yesterday = daysBefore(today, 1);
  const isToday = day === today;
  const isYesterday = day === yesterday;
  const candidates = [...suggested, ...recent];
  const dayLabel = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : formatDayLong(day);

  function pickDay(next: string) {
    setMonth(toDate(next));
    onChooseDay(next);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Mark {label} paid</DrawerTitle>
          <DrawerDescription className="sr-only">
            Choose when you paid, then link or add the expense.
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto px-4 pb-8">
          <div className="grid gap-2">
            <span className="text-eyebrow">When did you pay?</span>
            <div className="flex gap-2">
              <Button
                variant={isToday ? "default" : "outline"}
                className="flex-1"
                onClick={() => pickDay(today)}
              >
                Today
              </Button>
              <Button
                variant={isYesterday ? "default" : "outline"}
                className="flex-1"
                onClick={() => pickDay(yesterday)}
              >
                Yesterday
              </Button>
            </div>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                className="bg-transparent"
                month={month}
                onMonthChange={setMonth}
                selected={toDate(day)}
                disabled={{ after: toDate(today) }}
                onSelect={(date) => {
                  if (date) pickDay(ymd(date));
                }}
              />
            </div>
          </div>

          {hasAmount ? (
            <div className="grid gap-2">
              <span className="text-eyebrow">Expenses on {dayLabel}</span>
              {loading ? (
                <>
                  <CandidateSkeleton />
                  <CandidateSkeleton />
                </>
              ) : candidates.length > 0 ? (
                candidates.map((match) => (
                  <CandidateButton
                    key={match.id}
                    match={match}
                    onClick={() => onLink(match.id)}
                  />
                ))
              ) : (
                <p className="text-muted-foreground px-1 text-sm">
                  No expense found for {dayLabel}.
                </p>
              )}
              <Button variant="outline" disabled={loading} onClick={onCreate}>
                {candidates.length > 0
                  ? "None of these, add a new expense"
                  : "Add the expense"}
              </Button>
            </div>
          ) : (
            <Button variant="default" onClick={onSkip}>
              Mark as done
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
