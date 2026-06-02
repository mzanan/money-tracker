"use client";

import { useMemo } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { Surface } from "@/components/ui/surface";
import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { formatYearMonthLong } from "@/lib/dates";
import { periodTotals } from "@/lib/totals";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

import type { Transaction } from "@/types/db";

export type KindFilter = "all" | "income" | "expense";

interface Props {
  yearMonth: string;
  transactions: Transaction[];
  lifetimeTransactions: Transaction[];
  selectedKind: KindFilter;
  onKindChange: (next: KindFilter) => void;
  nav?: React.ReactNode;
}

export function BalanceHero({
  yearMonth,
  transactions,
  lifetimeTransactions,
  selectedKind,
  onKindChange,
  nav,
}: Props) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const displayMode = useUiStore((s) => s.displayMode);

  const monthTotals = useMemo(
    () =>
      periodTotals(
        transactions,
        settings.base_currency,
        displayMode,
        ratesQuery.data?.rates,
      ),
    [transactions, settings.base_currency, displayMode, ratesQuery.data],
  );

  const lifetimeTotals = useMemo(
    () =>
      periodTotals(
        lifetimeTransactions,
        settings.base_currency,
        displayMode,
        ratesQuery.data?.rates,
      ),
    [
      lifetimeTransactions,
      settings.base_currency,
      displayMode,
      ratesQuery.data,
    ],
  );

  const totalPositive = lifetimeTotals.net >= 0;
  const totalSigned = formatMoney(lifetimeTotals.net, settings.base_currency, {
    signed: true,
  });

  const monthPositive = monthTotals.net >= 0;
  const monthSigned = formatMoney(monthTotals.net, settings.base_currency, {
    signed: true,
  });

  function toggle(kind: "income" | "expense") {
    onKindChange(selectedKind === kind ? "all" : kind);
  }

  return (
    <Surface padding="lg">
      <span className="text-eyebrow">Total balance</span>
      <p
        className={cn(
          "font-heading text-[2.75rem] leading-[1.05] font-semibold tracking-tight tabular-nums",
          totalPositive ? "text-foreground" : "text-expense",
        )}
      >
        {totalSigned}
      </p>

      <div className="border-border mt-9 border-t pt-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="text-eyebrow">{formatYearMonthLong(yearMonth)}</span>
          {nav}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Mini
            label="In"
            value={`+${formatMoney(monthTotals.income, settings.base_currency)}`}
            icon={<ArrowDownRightIcon className="size-4" />}
            tone="income"
            active={selectedKind === "income"}
            dimmed={selectedKind === "expense"}
            onClick={() => toggle("income")}
          />
          <Mini
            label="Out"
            value={`-${formatMoney(monthTotals.expense, settings.base_currency)}`}
            icon={<ArrowUpRightIcon className="size-4" />}
            tone="expense"
            active={selectedKind === "expense"}
            dimmed={selectedKind === "income"}
            onClick={() => toggle("expense")}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Net this month</span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              monthPositive ? "text-foreground" : "text-expense",
            )}
          >
            {monthSigned}
          </span>
        </div>
      </div>
    </Surface>
  );
}

function Mini({
  label,
  value,
  icon,
  tone,
  active,
  dimmed,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "income" | "expense";
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "bg-background/60 dark:bg-surface-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all",
        "hover:bg-background/80 dark:hover:bg-surface-2/80 cursor-pointer",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        active &&
          (tone === "income"
            ? "ring-income/40 ring-2"
            : "ring-expense/40 ring-2"),
        dimmed && "opacity-50",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full",
          tone === "income"
            ? "bg-emerald-500/15 text-income"
            : "bg-rose-500/15 text-expense",
        )}
      >
        {icon}
      </span>
      <div className="grid">
        <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
    </button>
  );
}
