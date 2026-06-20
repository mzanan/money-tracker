"use client";

import { useState } from "react";
import {
  BellPlusIcon,
  CheckIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import {
  deleteReminder,
  getReminderPayOptions,
  markReminderPaid,
  type ReminderPaymentCandidate,
} from "@/lib/actions/reminders";
import { formatMoney } from "@/lib/currency";
import { daysBetween, dueLabel, frequencyLabel } from "@/lib/reminders";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconCircle } from "@/components/ui/iconCircle";

import { PayCandidatesDrawer } from "./payCandidatesDrawer";
import { ReminderForm } from "./reminderForm";

import type { RecurringPayment } from "@/types/db";

export function ReminderRow({
  reminder,
  today,
}: {
  reminder: RecurringPayment;
  today: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOptions, setPayOptions] = useState<{
    suggested: ReminderPaymentCandidate[];
    recent: ReminderPaymentCandidate[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const { run, pending } = useServerAction();
  const busy = pending || checking;

  const diff = daysBetween(today, reminder.next_due_on);
  const tone =
    diff < 0
      ? "text-destructive"
      : diff <= 7
        ? "text-warning"
        : "text-muted-foreground";

  const metaSegments = [
    frequencyLabel(reminder.frequency, reminder.interval_months),
  ];
  if (reminder.category) metaSegments.push(reminder.category);
  if (reminder.installments_total != null) {
    metaSegments.push(
      `${reminder.installments_paid}/${reminder.installments_total} paid`,
    );
  }

  async function handleMarkPaid() {
    setChecking(true);
    const res = await getReminderPayOptions(reminder.id);
    setChecking(false);
    setPayOptions(res.ok ? res.data! : { suggested: [], recent: [] });
  }

  function confirmPaid(linkTransactionId?: string) {
    setPayOptions(null);
    run(
      () =>
        markReminderPaid(
          reminder.id,
          undefined,
          linkTransactionId ? { linkTransactionId } : undefined,
        ),
      {
        success: (data) =>
          data?.completed
            ? "Last payment, reminder completed"
            : data?.linked
              ? "Marked paid, linked to the existing payment"
              : data?.expenseAdded
                ? "Marked paid, expense added"
                : "Marked paid, next due updated",
      },
    );
  }

  function markPaidOnly() {
    setPayOptions(null);
    run(() => markReminderPaid(reminder.id, undefined, { skipExpense: true }), {
      success: (data) =>
        data?.completed
          ? "Last payment, reminder completed"
          : "Marked paid, next due updated",
    });
  }

  function handleDelete() {
    run(() => deleteReminder(reminder.id), {
      confirm: `Delete reminder "${reminder.label}"?`,
      success: "Deleted",
    });
  }

  return (
    <li className="hover:bg-surface-2/60 group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors">
      <IconCircle
        className={cn(
          diff < 0
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary",
        )}
      >
        <BellPlusIcon className="size-4" />
      </IconCircle>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-semibold">
            {reminder.label}
          </span>
          {reminder.amount != null && (
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatMoney(reminder.amount, reminder.currency ?? "USD")}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground truncate text-meta">
            {metaSegments.join(" · ")}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium tabular-nums",
              tone,
            )}
          >
            {dueLabel(reminder.next_due_on, today)}
          </span>
        </div>
        {reminder.note && (
          <p className="text-muted-foreground/90 mt-1 truncate text-meta italic">
            {reminder.note}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleMarkPaid}
        disabled={busy}
        aria-label="Mark paid"
        className="text-muted-foreground hover:text-income"
      >
        {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={pending}
            className="text-muted-foreground hover:text-foreground -mr-1 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="More actions"
          >
            <MoreVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDelete} variant="destructive">
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReminderForm
        reminder={reminder}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <PayCandidatesDrawer
        open={payOptions !== null}
        label={reminder.label}
        suggested={payOptions?.suggested ?? []}
        recent={payOptions?.recent ?? []}
        onLink={(transactionId) => confirmPaid(transactionId)}
        onCreate={() => confirmPaid()}
        onSkip={markPaidOnly}
        onClose={() => setPayOptions(null)}
      />
    </li>
  );
}
