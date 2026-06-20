"use client";

import {
  BanknoteIcon,
  CheckIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import {
  markAsCashWithdrawal,
  unmarkCashWithdrawal,
} from "@/lib/actions/cash";
import { deleteTransaction } from "@/lib/actions/transactions";
import { kindOfSource, labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { tagHue } from "@/lib/tags";
import { transactionInDisplay } from "@/lib/totals";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/iconCircle";

import { ReminderButton } from "./reminderButton";
import { TagChips } from "./tagChips";
import { TagEditor } from "./tagEditor";

import type { Transaction } from "@/types/db";
import type { CSSProperties } from "react";

export function TransactionRow({
  tx,
  knownTags = [],
}: {
  tx: Transaction;
  knownTags?: string[];
}) {
  const settings = useSettings();
  const remove = useServerAction();
  const transfer = useServerAction();
  const canDelete = kindOfSource(tx.source) !== "api";
  const isTransfer = Boolean(tx.transfer_group);
  const canMarkWithdrawal =
    tx.kind === "expense" && tx.source !== "manual" && !isTransfer;
  const canUnmarkWithdrawal = isTransfer && tx.transfer_group === tx.id;
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
  const avatarSeed = tx.tags[0] || sourceLabel;
  const reminderTitle = tx.tags[0] || sourceLabel;
  const description = tx.note?.trim();

  return (
    <div
      onClick={txSelectMode ? () => toggleTxSelected(tx) : undefined}
      className={cn(
        "group hover:bg-surface-2/60 flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
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
          "flex items-center gap-3",
          txSelectMode && "pointer-events-none opacity-30",
        )}
      >
        <TagEditor
          txId={tx.id}
          tags={tx.tags}
          disabled={txSelectMode}
          knownTags={knownTags}
        />
        {(canMarkWithdrawal || canUnmarkWithdrawal) && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              transfer.run(
                () =>
                  canUnmarkWithdrawal
                    ? unmarkCashWithdrawal(tx.id)
                    : markAsCashWithdrawal(tx.id),
                canUnmarkWithdrawal
                  ? {
                      confirm: "Undo the cash withdrawal?",
                      success: "Withdrawal undone",
                    }
                  : {
                      confirm:
                        "Mark as a cash withdrawal? It moves the amount to your cash balance and leaves it out of spending totals.",
                      success: "Moved to cash",
                    },
              )
            }
            disabled={transfer.pending}
            aria-label={
              canUnmarkWithdrawal
                ? "Undo cash withdrawal"
                : "Mark as cash withdrawal"
            }
            className={cn(
              "hover:text-foreground -mr-0.5",
              canUnmarkWithdrawal ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {transfer.pending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <BanknoteIcon />
            )}
          </Button>
        )}
        <ReminderButton tx={tx} defaultTitle={reminderTitle} />
        {canDelete && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              remove.run(() => deleteTransaction(tx.id), {
                confirm: "Delete this transaction?",
                success: "Deleted",
              })
            }
            disabled={remove.pending}
            aria-label="Delete transaction"
            className="text-muted-foreground hover:text-destructive -mr-0.5"
          >
            {remove.pending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <Trash2Icon />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function Avatar({ seed }: { seed: string }) {
  const letter = (seed.trim()[0] ?? "?").toUpperCase();
  return (
    <IconCircle
      style={{ "--tag-h": tagHue(seed) } as CSSProperties}
      className="tag-chip text-sm font-semibold"
    >
      {letter}
    </IconCircle>
  );
}
