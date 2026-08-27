"use client";

import {
  BanknoteIcon,
  BellPlusIcon,
  CalendarArrowDownIcon,
  CheckIcon,
  CopyIcon,
  EllipsisIcon,
  LandmarkIcon,
  PencilLineIcon,
  PinIcon,
  Trash2Icon,
} from "lucide-react";

import { formatMoney } from "@/lib/currency";
import { formatDayShort } from "@/lib/dates";
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
import { ReminderFormStep } from "@/components/reminders/reminderFormStep";

import { Avatar } from "./avatar";
import { BudgetMonthBadge } from "./budgetMonthBadge";
import { TransactionFormDialog } from "./transactionFormDialog";
import { TransactionFormStep } from "./transactionFormStep";
import { MarkTransferDialog } from "./markTransferDialog";
import { MarkTransferStep } from "./markTransferStep";
import { SourceEditor } from "./sourceEditor";
import { SourceEditorStep } from "./sourceEditorStep";
import { TagChips } from "./tagChips";
import { TransferBadge } from "./transferBadge";
import { useTransactionRow } from "./useTransactionRow";

import type { Transaction } from "@/types/db";

export function TransactionRow({
  tx,
  showDate = false,
  showBudgetMonthBadges = true,
}: {
  tx: Transaction;
  showDate?: boolean;
  showBudgetMonthBadges?: boolean;
}) {
  const {
    baseCurrency,
    txSelectMode,
    isSelected,
    toggleSelected,
    avatarSeed,
    description,
    isTransfer,
    isWithdrawal,
    sign,
    inDisplay,
    showConverted,
    sourceLabel,
    reminderTitle,
    canChangeSource,
    canDelete,
    lockAmountFields,
    resolvedFixed,
    reminder,
    edit,
    transferDialog,
    source,
    duplicate,
    canShiftMonth,
    isMovedOut,
    isCarriedOver,
    budgetMonthLabel,
    handleUndoTransfer,
    handleDelete,
    handleToggleFixed,
    handleShiftBudgetMonth,
    stepApi,
    runAfterMenuClose,
  } = useTransactionRow(tx, showDate, showBudgetMonthBadges);

  const editSeed = {
    kind: tx.kind,
    amount: tx.amount_original,
    currency: tx.currency_original,
    source: tx.source,
    note: tx.note,
    tags: tx.tags,
    occurredOn: tx.occurred_on,
  };

  function openEdit() {
    if (stepApi) {
      runAfterMenuClose(() =>
        stepApi.push({
          key: `edit-${tx.id}`,
          content: (
            <TransactionFormStep
              txId={tx.id}
              seed={editSeed}
              locked={lockAmountFields}
              title="Edit transaction"
              description="Update the details for this transaction."
              submitLabel="Save"
              successMessage="Saved"
              onBack={stepApi.pop}
            />
          ),
        }),
      );
    } else {
      edit.openDialog();
    }
  }

  function openDuplicate() {
    if (stepApi) {
      runAfterMenuClose(() =>
        stepApi.push({
          key: `duplicate-${tx.id}`,
          content: (
            <TransactionFormStep
              seed={editSeed}
              title="Duplicate transaction"
              description="Creates a new transaction prefilled from this one."
              submitLabel="Duplicate"
              successMessage="Duplicated"
              onBack={stepApi.pop}
            />
          ),
        }),
      );
    } else {
      duplicate.openDialog();
    }
  }

  function openChangeAccount() {
    if (stepApi) {
      runAfterMenuClose(() =>
        stepApi.push({
          key: `source-${tx.id}`,
          content: (
            <SourceEditorStep
              txId={tx.id}
              txSource={tx.source}
              onBack={stepApi.pop}
            />
          ),
        }),
      );
    } else {
      source.openDialog();
    }
  }

  function openSetReminder() {
    if (stepApi) {
      runAfterMenuClose(() =>
        stepApi.push({
          key: `reminder-${tx.id}`,
          content: (
            <ReminderFormStep
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
              onBack={stepApi.pop}
            />
          ),
        }),
      );
    } else {
      reminder.openDialog();
    }
  }

  function openMarkTransfer() {
    if (stepApi) {
      runAfterMenuClose(() =>
        stepApi.push({
          key: `transfer-${tx.id}`,
          content: (
            <MarkTransferStep
              txId={tx.id}
              txSource={tx.source}
              txCurrency={tx.currency_original}
              txAmount={tx.amount_original}
              txKind={tx.kind}
              onBack={stepApi.pop}
            />
          ),
        }),
      );
    } else {
      transferDialog.openDialog();
    }
  }

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
          {(isTransfer || isWithdrawal) && (
            <TransferBadge>{isWithdrawal ? "Withdrawal" : "Transfer"}</TransferBadge>
          )}
          {isCarriedOver && (
            <BudgetMonthBadge
              direction="from"
              yearMonth={tx.occurred_on.slice(0, 7)}
            />
          )}
          {isMovedOut && tx.budget_month && (
            <BudgetMonthBadge direction="to" yearMonth={tx.budget_month} />
          )}
          <TagChips tags={tx.tags} />
        </span>
        {(showDate || description) && (
          <span className="text-muted-foreground text-meta mt-0.5 block truncate">
            {showDate && formatDayShort(tx.occurred_on)}
            {showDate && description ? " · " : ""}
            {description}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span
          className={cn(
            "text-sm leading-tight font-semibold tabular-nums",
            isMovedOut
              ? "text-muted-foreground"
              : tx.kind === "income"
                ? "text-income"
                : "text-foreground",
          )}
        >
          {sign}
          {inDisplay !== null
            ? formatMoney(inDisplay, baseCurrency)
            : formatMoney(tx.amount_original, tx.currency_original)}
        </span>
        {showConverted && (
          <span className="text-muted-foreground text-caption mt-0.5 tabular-nums">
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
            <DropdownMenuItem onSelect={openEdit}>
              <PencilLineIcon />
              Edit
            </DropdownMenuItem>
            {canChangeSource && (
              <DropdownMenuItem onSelect={openChangeAccount}>
                <LandmarkIcon />
                Change account
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={openDuplicate}>
              <CopyIcon />
              Duplicate
            </DropdownMenuItem>
            {isTransfer ? (
              <DropdownMenuItem onSelect={handleUndoTransfer}>
                <BanknoteIcon />
                Undo transfer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={openMarkTransfer}>
                <BanknoteIcon />
                Mark as transfer
              </DropdownMenuItem>
            )}
            {canShiftMonth && (
              <DropdownMenuItem onSelect={handleShiftBudgetMonth}>
                <CalendarArrowDownIcon />
                {budgetMonthLabel}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={openSetReminder}>
              <BellPlusIcon />
              Set reminder
            </DropdownMenuItem>
            {!isTransfer && (
              <DropdownMenuItem onSelect={handleToggleFixed}>
                <PinIcon />
                {resolvedFixed ? "Mark as variable" : "Mark as fixed"}
              </DropdownMenuItem>
            )}
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
          seed={editSeed}
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
          txAmount={tx.amount_original}
          txKind={tx.kind}
          open={transferDialog.open}
          onOpenChange={transferDialog.setOpen}
        />
      )}
      {duplicate.mounted && (
        <TransactionFormDialog
          key={duplicate.key}
          seed={editSeed}
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
