"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2Icon } from "lucide-react";

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

function ymd(date: Date): string {
  return format(date, "yyyy-MM-dd");
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const yesterday = daysBefore(today, 1);
  const isToday = day === today;
  const isYesterday = day === yesterday;
  const candidates = [...suggested, ...recent];
  const dayLabel = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : formatDayLong(day);

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
                disabled={loading}
                onClick={() => {
                  setPickerOpen(false);
                  onChooseDay(today);
                }}
              >
                Today
              </Button>
              <Button
                variant={isYesterday ? "default" : "outline"}
                className="flex-1"
                disabled={loading}
                onClick={() => {
                  setPickerOpen(false);
                  onChooseDay(yesterday);
                }}
              >
                Yesterday
              </Button>
              <Button
                variant={!isToday && !isYesterday ? "default" : "outline"}
                className="flex-1"
                disabled={loading}
                onClick={() => setPickerOpen((v) => !v)}
              >
                Pick a date
              </Button>
            </div>
            {pickerOpen && (
              <Calendar
                mode="single"
                className="bg-transparent"
                selected={new Date(`${day}T00:00:00`)}
                disabled={{ after: new Date() }}
                onSelect={(date) => {
                  if (!date) return;
                  setPickerOpen(false);
                  onChooseDay(ymd(date));
                }}
              />
            )}
          </div>

          {hasAmount ? (
            loading ? (
              <div className="flex justify-center py-6">
                <Loader2Icon className="text-muted-foreground animate-spin" />
              </div>
            ) : (
              <div className="grid gap-2">
                <span className="text-eyebrow">Expenses on {dayLabel}</span>
                {candidates.length > 0 ? (
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
                <Button variant="outline" onClick={onCreate}>
                  {candidates.length > 0
                    ? "None of these, add a new expense"
                    : "Add the expense"}
                </Button>
              </div>
            )
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
