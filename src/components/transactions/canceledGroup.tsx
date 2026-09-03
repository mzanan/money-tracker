"use client";

import { useState } from "react";
import { ChevronRightIcon, Undo2Icon } from "lucide-react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { resolveSourceLabel } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { CanceledPair } from "@/lib/cancellations";

import { IconCircle } from "@/components/ui/iconCircle";
import { TappableRow } from "@/components/ui/tappableRow";

import { TransactionRow } from "./transactionRow";

export function CanceledGroup({
  pair,
  showBudgetMonthBadges = true,
  recurringNotes,
}: {
  pair: CanceledPair;
  showBudgetMonthBadges?: boolean;
  recurringNotes?: Set<string>;
}) {
  const accountLabels = useAccountLabels();
  const [open, setOpen] = useState(false);
  const sourceLabel = resolveSourceLabel(pair.expense.source, accountLabels);
  const title =
    pair.expense.note?.trim() || `Canceled payment · ${sourceLabel}`;

  return (
    <div className="grid min-w-0">
      <TappableRow
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="focus-visible:ring-ring w-full cursor-pointer opacity-70 focus-visible:ring-2 focus-visible:outline-none"
      >
        <IconCircle className="bg-surface-2 text-muted-foreground size-9">
          <Undo2Icon className="size-4" />
        </IconCircle>
        <span className="min-w-0 flex-1">
          <span className="text-foreground block truncate text-sm font-medium">
            {title}
          </span>
          <span className="text-muted-foreground block text-meta">
            Canceled and refunded · {sourceLabel}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-muted-foreground text-sm font-medium tabular-nums line-through">
            {formatMoney(
              pair.expense.amount_original,
              pair.expense.currency_original,
            )}
          </span>
          <span className="text-muted-foreground mt-0.5 text-meta">net 0</span>
        </span>
        <ChevronRightIcon
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
      </TappableRow>
      {open && (
        <div className="grid min-w-0 gap-px pl-3">
          <TransactionRow
            tx={pair.expense}
            showBudgetMonthBadges={showBudgetMonthBadges}
            recurringNotes={recurringNotes}
          />
          <TransactionRow
            tx={pair.income}
            showBudgetMonthBadges={showBudgetMonthBadges}
            recurringNotes={recurringNotes}
          />
        </div>
      )}
    </div>
  );
}
