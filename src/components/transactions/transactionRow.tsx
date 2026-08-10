"use client";

import {
  BanknoteIcon,
  BellPlusIcon,
  CheckIcon,
  CopyIcon,
  EllipsisIcon,
  LandmarkIcon,
  PencilLineIcon,
  Trash2Icon,
} from "lucide-react";

import { formatMoney } from "@/lib/currency";
import { computeNextDue } from "@/lib/reminders";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TappableRow } from "@/components/ui/tappableRow";
import { ReminderForm } from "@/components/reminders/reminderForm";

import { Avatar } from "./avatar";
import { TransactionFormDialog } from "./transactionFormDialog";
import { MarkTransferDialog } from "./markTransferDialog";
import { SourceEditor } from "./sourceEditor";
import { TagChips } from "./tagChips";
import { TransferBadge } from "./transferBadge";
import { useTransactionRow } from "./useTransactionRow";

import type { Transaction } from "@/types/db";

export function TransactionRow({ tx }: { tx: Transaction }) {
  const {
    baseCurrency,
    txSelectMode,
    isSelected,
    toggleSelected,
    avatarSeed,
    description,
    isTransfer,
    sign,
    inDisplay,
    showConverted,
    sourceLabel,
    reminderTitle,
    canChangeSource,
    canDelete,
    lockAmountFields,
    reminder,
    edit,
    transferDialog,
    source,
    duplicate,
    handleUndoTransfer,
    handleDelete,
  } = useTransactionRow(tx);

  return (
    <TappableRow
      as="div"
      onClick={txSelectMode ? toggleSelected : undefined}
      className={cn(
        "group min-w-0",
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
          {isTransfer && <TransferBadge />}
          <TagChips tags={tx.tags} />
        </span>
        {description && (
          <span className="text-muted-foreground text-meta mt-0.5 block truncate">
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
            ? formatMoney(inDisplay, baseCurrency)
            : formatMoney(tx.amount_original, tx.currency_original)}
        </span>
        {showConverted && (
          <span className="text-muted-foreground mt-0.5 text-caption tabular-nums">
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
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="More actions"
                className="text-muted-foreground hover:text-foreground -mr-0.5"
              >
                <EllipsisIcon />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={edit.openDialog}>
              <PencilLineIcon />
              Edit
            </DropdownMenuItem>
            {canChangeSource && (
              <DropdownMenuItem onSelect={source.openDialog}>
                <LandmarkIcon />
                Change account
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={duplicate.openDialog}>
              <CopyIcon />
              Duplicate
            </DropdownMenuItem>
            {isTransfer ? (
              <DropdownMenuItem onSelect={handleUndoTransfer}>
                <BanknoteIcon />
                Undo transfer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={transferDialog.openDialog}>
                <BanknoteIcon />
                Mark as transfer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={reminder.openDialog}>
              <BellPlusIcon />
              Set reminder
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleDelete}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {edit.mounted && (
        <TransactionFormDialog
          key={edit.key}
          txId={tx.id}
          seed={{
            kind: tx.kind,
            amount: tx.amount_original,
            currency: tx.currency_original,
            source: tx.source,
            note: tx.note,
            tags: tx.tags,
            occurredOn: tx.occurred_on,
          }}
          locked={lockAmountFields}
          open={edit.open}
          onOpenChange={edit.setOpen}
          title="Edit transaction"
          description="Update the details for this transaction."
          submitLabel="Save"
          successMessage="Saved"
        />
      )}
      {reminder.mounted && (
        <ReminderForm
          open={reminder.open}
          onOpenChange={reminder.setOpen}
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
      {source.mounted && (
        <SourceEditor
          txId={tx.id}
          txSource={tx.source}
          open={source.open}
          onOpenChange={source.setOpen}
        />
      )}
      {transferDialog.mounted && (
        <MarkTransferDialog
          txId={tx.id}
          txSource={tx.source}
          txCurrency={tx.currency_original}
          open={transferDialog.open}
          onOpenChange={transferDialog.setOpen}
        />
      )}
      {duplicate.mounted && (
        <TransactionFormDialog
          key={duplicate.key}
          seed={{
            kind: tx.kind,
            amount: tx.amount_original,
            currency: tx.currency_original,
            source: tx.source,
            note: tx.note,
            tags: tx.tags,
            occurredOn: tx.occurred_on,
          }}
          open={duplicate.open}
          onOpenChange={duplicate.setOpen}
          title="Duplicate transaction"
          description="Creates a new transaction prefilled from this one."
          submitLabel="Duplicate"
          successMessage="Duplicated"
        />
      )}
    </TappableRow>
  );
}
