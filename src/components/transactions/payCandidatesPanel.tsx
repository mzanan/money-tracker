"use client";

import { ChevronLeftIcon } from "lucide-react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { resolveSourceLabel } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { formatDateShort, formatYmd, parseYmd } from "@/lib/dates";
import type { ReminderPaymentCandidate } from "@/lib/actions/reminders";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { TappableRow } from "@/components/ui/tappableRow";

import type { RecurringPayment } from "@/types/db";

import { usePayCandidatesPanel } from "./usePayCandidatesPanel";

function CandidateButton({
  match,
  onClick,
}: {
  match: ReminderPaymentCandidate;
  onClick: () => void;
}) {
  const accountLabels = useAccountLabels();
  return (
    <TappableRow type="button" bordered justify="between" onClick={onClick}>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {resolveSourceLabel(match.source, accountLabels)}
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
    </TappableRow>
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

export function PayCandidatesPanel({
  reminder,
  today,
  day,
  loading,
  suggested,
  recent,
  onChooseDay,
  onLink,
  onCreate,
  onSkip,
  onBack,
}: {
  reminder: RecurringPayment;
  today: string;
  day: string;
  loading: boolean;
  suggested: ReminderPaymentCandidate[];
  recent: ReminderPaymentCandidate[];
  onChooseDay: (day: string) => void;
  onLink: (transactionId: string) => void;
  onCreate: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const {
    month,
    setMonth,
    showLoading,
    yesterday,
    isToday,
    isYesterday,
    dayLabel,
    pickDay,
  } = usePayCandidatesPanel({ day, today, loading, onChooseDay });
  const candidates = [...suggested, ...recent];
  const hasAmount = reminder.amount != null;

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to calendar"
          onClick={onBack}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            Mark {reminder.label} paid
          </p>
          {reminder.amount != null && (
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatMoney(reminder.amount, reminder.currency ?? "USD")}
            </p>
          )}
        </div>
      </div>

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
            selected={parseYmd(day)}
            disabled={{ after: parseYmd(today) }}
            onSelect={(date) => {
              if (date) pickDay(formatYmd(date));
            }}
          />
        </div>
      </div>

      {hasAmount ? (
        <div className="grid gap-2">
          <span className="text-eyebrow">Expenses on {dayLabel}</span>
          {showLoading ? (
            <>
              <CandidateSkeleton />
              <CandidateSkeleton />
            </>
          ) : loading ? null : candidates.length > 0 ? (
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
  );
}
