"use client";

import { useState } from "react";
import {
  BanknoteIcon,
  BellPlusIcon,
  CheckIcon,
  EllipsisIcon,
  PencilLineIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { deleteTransaction } from "@/lib/actions/transactions";
import { unmarkTransfer } from "@/lib/actions/transfers";
import { kindOfSource, labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { computeNextDue } from "@/lib/reminders";
import { transactionInDisplay } from "@/lib/totals";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReminderForm } from "@/components/reminders/reminderForm";

import { Avatar } from "./avatar";
import { MarkTransferDialog } from "./markTransferDialog";
import { NoteEditor } from "./noteEditor";
import { TagChips } from "./tagChips";
import { TagEditor } from "./tagEditor";

import type { Transaction } from "@/types/db";

export function TransactionRow({ tx }: { tx: Transaction }) {
  const settings = useSettings();
  const remove = useServerAction();
  const transfer = useServerAction();
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderMounted, setReminderMounted] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagsMounted, setTagsMounted] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteMounted, setNoteMounted] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferMounted, setTransferMounted] = useState(false);
  const canDelete = kindOfSource(tx.source) !== "api";
  const isTransfer = Boolean(tx.transfer_group);
  const txSelectMode = useUiStore((s) => s.txSelectMode);
  const selectedTxs = useUiStore((s) => s.selectedTxs);
  const toggleTxSelected = useUiStore((s) => s.toggleTxSelected);
  const isSelected = selectedTxs.some((t) => t.id === tx.id);

  let inDisplay: number | null;
  try {
    inDisplay = transactionInDisplay(tx, settings.base_currency);
  } catch {
    inDisplay = null;
  }

  const sameAsBase = tx.currency_original === settings.base_currency;
  const sign = tx.kind === "income" ? "+" : "-";
  const showConverted = !sameAsBase && inDisplay !== null;
  const sourceLabel = labelForSource(tx.source);

  function openTags() {
    setTagsMounted(true);
    setTagsOpen(true);
  }

  function openNote() {
    setNoteMounted(true);
    setNoteOpen(true);
  }

  function openReminder() {
    setReminderMounted(true);
    setReminderOpen(true);
  }

  function openTransfer() {
    setTransferMounted(true);
    setTransferOpen(true);
  }

  const avatarSeed = tx.tags[0] || sourceLabel;
  const reminderTitle = tx.tags[0] || sourceLabel;
  const description = tx.note?.trim();

  return (
    <div
      onClick={txSelectMode ? () => toggleTxSelected(tx) : undefined}
      className={cn(
        "group hover:bg-surface-2/60 flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
        txSelectMode && "cursor-pointer",
        isSelected && "bg-primary/10 hover:bg-primary/15",
      )}
    >
      <div className="relative shrink-0">
        <Avatar seed={avatarSeed} />
        {txSelectMode && isSelected && (
          <span className="bg-primary text-primary-foreground absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full">
            <CheckIcon className="size-3" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-foreground shrink-0 text-sm leading-tight font-medium">
            {sourceLabel}
          </span>
          {isTransfer && (
            <Badge variant="secondary" className="shrink-0">
              Transfer
            </Badge>
          )}
          <TagChips tags={tx.tags} />
        </span>
        {description && (
          <span className="text-muted-foreground mt-0.5 block truncate text-meta">
            {description}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span
          className={cn(
            "text-sm leading-tight font-semibold tabular-nums",
            tx.kind === "income" ? "text-income" : "text-foreground",
          )}
        >
          {sign}
          {inDisplay !== null
            ? formatMoney(inDisplay, settings.base_currency)
            : formatMoney(tx.amount_original, tx.currency_original)}
        </span>
        {showConverted && (
          <span className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
            {formatMoney(tx.amount_original, tx.currency_original)}
          </span>
        )}
      </div>
      <div
        className={cn(
          "flex items-center gap-1",
          txSelectMode && "pointer-events-none opacity-30",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="More actions"
              className="text-muted-foreground hover:text-foreground -mr-0.5"
            >
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={openNote}>
              <PencilLineIcon />
              Edit description
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={openTags}>
              <TagIcon />
              Edit tags
            </DropdownMenuItem>
            {isTransfer ? (
              <DropdownMenuItem
                onSelect={() =>
                  transfer.run(() => unmarkTransfer(tx.id), {
                    confirm: "Undo this transfer?",
                    success: "Transfer undone",
                  })
                }
              >
                <BanknoteIcon />
                Undo transfer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={openTransfer}>
                <BanknoteIcon />
                Mark as transfer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={openReminder}>
              <BellPlusIcon />
              Set reminder
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() =>
                  remove.run(() => deleteTransaction(tx.id), {
                    confirm: "Delete this transaction?",
                    success: "Deleted",
                  })
                }
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {tagsMounted && (
        <TagEditor
          txId={tx.id}
          tags={tx.tags}
          open={tagsOpen}
          onOpenChange={setTagsOpen}
        />
      )}
      {noteMounted && (
        <NoteEditor
          txId={tx.id}
          note={tx.note}
          open={noteOpen}
          onOpenChange={setNoteOpen}
        />
      )}
      {reminderMounted && (
        <ReminderForm
          open={reminderOpen}
          onOpenChange={setReminderOpen}
          title="Set a reminder"
          seed={{
            label: reminderTitle,
            amount: tx.amount_original,
            currency: tx.currency_original,
            source: tx.source,
            frequency: "MONTHLY",
            lastPaidOn: tx.occurred_on,
            nextDueOn: computeNextDue(tx.occurred_on, "MONTHLY"),
            note: null,
          }}
        />
      )}
      {transferMounted && (
        <MarkTransferDialog
          txId={tx.id}
          txSource={tx.source}
          open={transferOpen}
          onOpenChange={setTransferOpen}
        />
      )}
    </div>
  );
}

