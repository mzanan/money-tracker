"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, MoreVerticalIcon, Trash2Icon } from "lucide-react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { labelForSource } from "@/lib/constants/sources";
import { deleteTransaction } from "@/lib/actions/transactions";
import { formatMoney } from "@/lib/currency";
import { transactionInDisplay } from "@/lib/totals";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EditableNote } from "./editableNote";
import { ReminderButton } from "./reminderButton";

import type { Transaction } from "@/types/db";

export function TransactionRow({ tx }: { tx: Transaction }) {
  const router = useRouter();
  const settings = useSettings();
  const ratesQuery = useRates();
  const displayMode = useUiStore((s) => s.displayMode);
  const [pending, startTransition] = useTransition();

  let inDisplay: number | null;
  try {
    inDisplay = transactionInDisplay(
      tx,
      settings.base_currency,
      displayMode,
      ratesQuery.data?.rates,
    );
  } catch {
    inDisplay = null;
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete this ${tx.kind === "income" ? "income" : "expense"} of ${formatMoney(
          tx.amount_original,
          tx.currency_original,
        )}?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTransaction(tx.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  }

  const sameAsBase = tx.currency_original === settings.base_currency;
  const sign = tx.kind === "income" ? "+" : "-";
  const showConverted = !sameAsBase && inDisplay !== null;
  const sourceLabel = labelForSource(tx.source);

  const identifierSegments: string[] = [sourceLabel];
  if (tx.category) identifierSegments.push(tx.category);
  const identifier = identifierSegments.join(" · ");

  const avatarSeed = tx.category || sourceLabel;
  const reminderTitle = tx.note?.trim() || identifier;

  return (
    <div className="group hover:bg-surface-2/60 flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors">
      <Avatar seed={avatarSeed} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground truncate text-[11px] tracking-wide uppercase">
            {identifier}
          </span>
          <span
            className={cn(
              "shrink-0 text-sm leading-tight font-semibold tabular-nums",
              tx.kind === "income" ? "text-income" : "text-foreground",
            )}
          >
            {sign}
            {formatMoney(tx.amount_original, tx.currency_original)}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <EditableNote id={tx.id} note={tx.note} />
          {showConverted && (
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              ≈ {formatMoney(inDisplay!, settings.base_currency)}
            </span>
          )}
        </div>
      </div>
      <ReminderButton tx={tx} defaultTitle={reminderTitle} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={pending}
            className="text-muted-foreground hover:text-foreground -mr-1 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="More actions"
          >
            {pending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <MoreVerticalIcon />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleDelete} variant="destructive">
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        tone,
      )}
    >
      {letter}
    </span>
  );
}
