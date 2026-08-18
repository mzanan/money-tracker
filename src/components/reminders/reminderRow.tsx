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
import { TappableRow } from "@/components/ui/tappableRow";

import { ReminderForm } from "./reminderForm";
import { ReminderFormStep } from "./reminderFormStep";
import { useReminderRow } from "./useReminderRow";

import type { RecurringPayment } from "@/types/db";

export function ReminderRow({
  reminder,
  today,
  onMarkPaid,
  anyPayPending,
  paySubmitting,
}: {
  reminder: RecurringPayment;
  today: string;
  onMarkPaid: () => void;
  anyPayPending: boolean;
  paySubmitting: boolean;
}) {
  const {
    editOpen,
    setEditOpen,
    pending,
    diff,
    tone,
    metaSegments,
    handleDelete,
    stepApi,
  } = useReminderRow(reminder, today);
  const runAfterMenuClose = useDeferredMenuAction();

  function openEdit() {
    if (stepApi) {
      stepApi.push({
        key: `reminder-edit-${reminder.id}`,
        content: (
          <ReminderFormStep reminder={reminder} onBack={stepApi.pop} />
        ),
      });
    } else {
      setEditOpen(true);
    }
  }

  return (
    <TappableRow as="li" className="group">
      <button
        type="button"
        onClick={openEdit}
        aria-label={`Edit ${reminder.label}`}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
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
            <span className="text-muted-foreground text-meta truncate">
              {metaSegments.join(" · ")}
            </span>
            <span
              className={cn(
                "text-caption shrink-0 font-medium tabular-nums",
                tone,
              )}
            >
              {dueLabel(reminder.next_due_on, today)}
            </span>
          </div>
          {reminder.note && (
            <p className="text-muted-foreground/90 text-meta mt-1 truncate italic">
              {reminder.note}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onMarkPaid}
          disabled={pending || anyPayPending}
          aria-label="Mark paid"
          className="text-muted-foreground hover:text-income"
        >
          {paySubmitting ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <CheckIcon />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                className="text-muted-foreground hover:text-foreground -mr-1 opacity-0 transition-opacity group-hover:opacity-100 data-popup-open:opacity-100"
                aria-label="More actions"
              >
                <MoreVerticalIcon />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => runAfterMenuClose(openEdit)}>
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
    </TappableRow>
  );
}
