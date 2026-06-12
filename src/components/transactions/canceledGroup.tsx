"use client";

import { useState } from "react";
import { ChevronRightIcon, Undo2Icon } from "lucide-react";

import { labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { CanceledPair } from "@/lib/cancellations";

import { TransactionRow } from "./transactionRow";

export function CanceledGroup({ pair }: { pair: CanceledPair }) {
  const [open, setOpen] = useState(false);
  const title =
    pair.expense.note?.trim() ||
    `Canceled payment · ${labelForSource(pair.expense.source)}`;

  return (
    <div className="grid min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="hover:bg-surface-2/60 focus-visible:ring-ring flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left opacity-70 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="bg-surface-2 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
          <Undo2Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-foreground block truncate text-sm font-medium">
            {title}
          </span>
          <span className="text-muted-foreground block text-meta">
            Canceled and refunded · {labelForSource(pair.expense.source)}
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
      </button>
      {open && (
        <div className="grid min-w-0 gap-px pl-3">
          <TransactionRow tx={pair.expense} />
          <TransactionRow tx={pair.income} />
        </div>
      )}
    </div>
  );
}
