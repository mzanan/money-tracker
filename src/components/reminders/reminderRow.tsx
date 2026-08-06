"use client";

import {
  BellPlusIcon,
  CheckIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { formatMoney } from "@/lib/currency";
import { dueLabel } from "@/lib/reminders";
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
import { useReminderRow } from "./useReminderRow";

import type { RecurringPayment } from "@/types/db";

export function ReminderRow({
  reminder,
  today,
}: {
  reminder: RecurringPayment;
  today: string;
}) {
  const {
    editOpen,
    setEditOpen,
    payOptions,
    setPayOptions,
    busy,
    pending,
    diff,
    tone,
    metaSegments,
    handleMarkPaid,
    confirmPaid,
    markPaidOnly,
    handleDelete,
  } = useReminderRow(reminder, today);
  const runAfterMenuClose = useDeferredMenuAction();

  return (
    <li
      onClick={() => setEditOpen(true)}
      className="hover:bg-surface-2/60 group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition-colors"
    >
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

      <div
        onClick={(event) => event.stopPropagation()}
        className="flex items-center gap-3"
      >
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
            <DropdownMenuItem
              onSelect={() => runAfterMenuClose(() => setEditOpen(true))}
            >
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => runAfterMenuClose(handleDelete)}
              variant="destructive"
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
