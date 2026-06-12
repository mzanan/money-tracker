"use client";

import {
  BanknoteIcon,
  CheckIcon,
  Loader2Icon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import {
  markAsCashWithdrawal,
  unmarkCashWithdrawal,
} from "@/lib/actions/cash";
import {
  deleteTransaction,
  updateTransactionTags,
} from "@/lib/actions/transactions";
import { SUGGESTED_TAGS } from "@/lib/constants/tags";
import { labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
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
import { IconCircle } from "@/components/ui/iconCircle";

import { ReminderButton } from "./reminderButton";
import { useCommentEdit } from "./useCommentEdit";

import type { Transaction } from "@/types/db";

export function TransactionRow({ tx }: { tx: Transaction }) {
  const allTags = [
    ...SUGGESTED_TAGS,
    ...tx.tags.filter(
      (tag) => !SUGGESTED_TAGS.includes(tag as (typeof SUGGESTED_TAGS)[number]),
    ),
  ];
  const settings = useSettings();
  const comment = useCommentEdit(tx.id, tx.comment);
  const remove = useServerAction();
  const setTags = useServerAction();
  const transfer = useServerAction();
  const canDelete = tx.source === "manual";
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

  const identifier = [sourceLabel, ...tx.tags].join(" · ");

  const description = tx.note?.trim();
  const avatarSeed = tx.tags[0] || sourceLabel;
  const reminderTitle = description || identifier;

  return (
    <div
      onClick={txSelectMode ? () => toggleTxSelected(tx) : undefined}
      className={cn(
        "group hover:bg-surface-2/60 flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
        txSelectMode && "cursor-pointer",
        isSelected && "bg-primary/10 hover:bg-primary/15",
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Set tags"
          disabled={txSelectMode || setTags.pending}
          className={cn(
            "focus-visible:ring-ring relative shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none",
            txSelectMode && "pointer-events-none",
          )}
        >
          <Avatar seed={avatarSeed} />
          {txSelectMode && isSelected && (
            <span className="bg-primary text-primary-foreground absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full">
              <CheckIcon className="size-3" />
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {allTags.map((tag) => {
            const active = tx.tags.includes(tag);
            return (
              <DropdownMenuItem
                key={tag}
                onClick={() =>
                  setTags.run(
                    () =>
                      updateTransactionTags(
                        tx.id,
                        active
                          ? tx.tags.filter((t) => t !== tag)
                          : [...tx.tags, tag],
                      ),
                    { success: active ? `Removed ${tag}` : `Tagged ${tag}` },
                  )
                }
                className={cn(active && "font-semibold")}
              >
                {active && <CheckIcon className="size-3.5" />}
                {tag}
              </DropdownMenuItem>
            );
          })}
          {tx.tags.length > 0 && (
            <DropdownMenuItem
              onClick={() =>
                setTags.run(() => updateTransactionTags(tx.id, []), {
                  success: "Tags cleared",
                })
              }
              className="text-muted-foreground"
            >
              Clear tags
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm leading-tight font-medium">
          {identifier}
          {isTransfer && (
            <Badge variant="secondary" className="ml-1.5 align-middle">
              Transfer
            </Badge>
          )}
        </span>
        {description && (
          <span className="text-muted-foreground mt-0.5 block truncate text-meta">
            {description}
          </span>
        )}
        {comment.editing ? (
          <input
            {...comment.inputProps}
            onBlur={comment.submit}
            placeholder="What was this for?"
            disabled={comment.pending}
            maxLength={280}
            className="border-primary/50 focus:border-primary mt-1 block w-full max-w-[14rem] border-b bg-transparent text-sm leading-tight outline-none disabled:opacity-60"
          />
        ) : (
          comment.current && (
            <Badge asChild variant="secondary" className="mt-1 max-w-full">
              <button
                type="button"
                onClick={comment.start}
                aria-label="Edit note"
                className="min-w-0"
              >
                <StickyNoteIcon />
                <span className="truncate">{comment.current}</span>
              </button>
            </Badge>
          )
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
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={comment.start}
        disabled={comment.pending}
        aria-label={comment.current ? "Edit note" : "Add note"}
        className={cn(
          "hover:text-foreground -mr-0.5",
          comment.current ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {comment.pending ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <StickyNoteIcon />
        )}
      </Button>
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
            canUnmarkWithdrawal ? "Undo cash withdrawal" : "Mark as cash withdrawal"
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

const AVATAR_TONES = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
];

function Avatar({ seed }: { seed: string }) {
  const letter = (seed.trim()[0] ?? "?").toUpperCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];

  return (
    <IconCircle className={cn("text-sm font-semibold", tone)}>
      {letter}
    </IconCircle>
  );
}
