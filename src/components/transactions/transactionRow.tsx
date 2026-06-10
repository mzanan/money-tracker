"use client";

import { Loader2Icon, StickyNoteIcon, Trash2Icon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import {
  deleteTransaction,
  updateTransactionCategory,
} from "@/lib/actions/transactions";
import { CATEGORIES } from "@/lib/constants/categories";
import { labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { transactionInDisplay } from "@/lib/totals";
import { cn } from "@/lib/utils";

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
  const settings = useSettings();
  const comment = useCommentEdit(tx.id, tx.comment);
  const remove = useServerAction();
  const setCategory = useServerAction();
  const canDelete = tx.source === "manual";

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

  const identifierSegments: string[] = [sourceLabel];
  if (tx.category) identifierSegments.push(tx.category);
  const identifier = identifierSegments.join(" · ");

  const description = tx.note?.trim();
  const avatarSeed = tx.category || sourceLabel;
  const reminderTitle = description || identifier;

  return (
    <div className="group hover:bg-surface-2/60 flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Set category"
          disabled={setCategory.pending}
          className="focus-visible:ring-ring shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <Avatar seed={avatarSeed} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CATEGORIES.map((category) => (
            <DropdownMenuItem
              key={category}
              onClick={() =>
                setCategory.run(
                  () => updateTransactionCategory(tx.id, category),
                  { success: `Categorized as ${category}` },
                )
              }
              className={cn(tx.category === category && "font-semibold")}
            >
              {category}
            </DropdownMenuItem>
          ))}
          {tx.category && (
            <DropdownMenuItem
              onClick={() =>
                setCategory.run(
                  () => updateTransactionCategory(tx.id, null),
                  { success: "Category cleared" },
                )
              }
              className="text-muted-foreground"
            >
              Clear category
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm leading-tight font-medium">
          {identifier}
        </span>
        {(description || comment.current || comment.editing) && (
          <div className="mt-0.5 flex items-center gap-2">
            {description && (
              <span className="text-muted-foreground min-w-0 truncate text-meta">
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
                className="border-primary/50 focus:border-primary min-w-0 flex-1 border-b bg-transparent text-sm leading-tight font-medium outline-none disabled:opacity-60"
              />
            ) : (
              comment.current && (
                <Badge asChild variant="secondary" className="max-w-[60%] shrink-0">
                  <button
                    type="button"
                    onClick={comment.start}
                    aria-label="Edit note"
                  >
                    <StickyNoteIcon />
                    <span className="truncate">{comment.current}</span>
                  </button>
                </Badge>
              )
            )}
          </div>
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
