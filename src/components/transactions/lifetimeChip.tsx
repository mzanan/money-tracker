"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon, InfinityIcon } from "lucide-react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { periodTotals } from "@/lib/totals";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { Transaction } from "@/types/db";

interface Props {
  transactions: Transaction[];
}

export function LifetimeChip({ transactions }: Props) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const displayMode = useUiStore((s) => s.displayMode);
  const [open, setOpen] = useState(false);

  const totals = useMemo(
    () =>
      periodTotals(
        transactions,
        settings.base_currency,
        displayMode,
        ratesQuery.data?.rates,
      ),
    [transactions, settings.base_currency, displayMode, ratesQuery.data],
  );

  const positive = totals.net >= 0;
  const netSigned = formatMoney(totals.net, settings.base_currency, {
    signed: true,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="bg-card hover:bg-surface-2 group flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors"
        >
          <span className="flex items-center gap-3">
            <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-full">
              <InfinityIcon className="size-4" />
            </span>
            <span className="grid">
              <span className="text-[11px] text-muted-foreground tracking-wide uppercase">
                Lifetime
              </span>
              <span className="text-sm font-medium">All transactions</span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                positive ? "text-foreground" : "text-expense",
              )}
            >
              {netSigned}
            </span>
            <ChevronRightIcon className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lifetime balance</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-3 gap-3">
          <Stat
            label="Income"
            value={`+${formatMoney(totals.income, settings.base_currency)}`}
            tone="income"
          />
          <Stat
            label="Expenses"
            value={`-${formatMoney(totals.expense, settings.base_currency)}`}
            tone="expense"
          />
          <Stat
            label="Net"
            value={netSigned}
            tone={positive ? "income" : "expense"}
          />
        </dl>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-eyebrow">{label}</dt>
      <dd
        className={cn(
          "font-semibold tabular-nums",
          tone === "income" ? "text-income" : "text-expense",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
