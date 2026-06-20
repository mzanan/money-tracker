"use client";

import { useMemo } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { excludeCanceledPairs } from "@/lib/cancellations";
import { formatMoney } from "@/lib/currency";
import { formatYearMonthShort } from "@/lib/dates";
import { HIDDEN_AMOUNT } from "@/lib/preferences";
import { periodTotals } from "@/lib/totals";
import { cn } from "@/lib/utils";

import type { Transaction } from "@/types/db";

import { AmountsToggle } from "./amountsToggle";
import { DaySpendView } from "./daySpendView";

import type { useDaySpend } from "./useDaySpend";

export type KindFilter = "all" | "income" | "expense";
export type HeroView = "monthly" | "daily";

interface Props {
  yearMonth: string;
  transactions: Transaction[];
  lifetimeTransactions: Transaction[];
  selectedKind: KindFilter;
  onKindChange: (next: KindFilter) => void;
  hasOlder: boolean;
  hasNewer: boolean;
  onShiftMonth: (delta: number) => void;
  view: HeroView;
  onViewChange: (next: HeroView) => void;
  daySpend: ReturnType<typeof useDaySpend>;
}

export function BalanceHero({
  yearMonth,
  transactions,
  lifetimeTransactions,
  selectedKind,
  onKindChange,
  hasOlder,
  hasNewer,
  onShiftMonth,
  view,
  onViewChange,
  daySpend,
}: Props) {
  const settings = useSettings();
  const { hideAmounts } = useHideAmounts();

  const monthTotals = useMemo(
    () =>
      periodTotals(excludeCanceledPairs(transactions), settings.base_currency),
    [transactions, settings.base_currency],
  );

  const lifetimeTotals = useMemo(
    () => periodTotals(lifetimeTransactions, settings.base_currency),
    [lifetimeTransactions, settings.base_currency],
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
      <Tabs value={view} onValueChange={(v) => onViewChange(v as HeroView)}>
        <div className="mb-6 flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
          </TabsList>
          {view === "monthly" ? (
            <PeriodNav
              label={formatYearMonthShort(yearMonth)}
              canPrev={hasOlder}
              canNext={hasNewer}
              onShift={onShiftMonth}
              prevLabel="Previous month"
              nextLabel="Next month"
              tabular
            />
          ) : (
            <PeriodNav
              label={daySpend.dayLabel}
              canPrev={daySpend.canPrev}
              canNext={daySpend.canNext}
              onShift={daySpend.shift}
              prevLabel="Previous day"
              nextLabel="Next day"
            />
          )}
        </div>

        <TabsContent value="monthly">
          <div className="flex items-center gap-1.5">
            <span className="text-eyebrow">Total balance</span>
            <AmountsToggle />
          </div>
          <p
            className={cn(
              "font-heading text-[clamp(2rem,9vw,2.75rem)] leading-[1.05] font-semibold tracking-tight tabular-nums",
              totalPositive ? "text-foreground" : "text-expense",
            )}
          >
            {hideAmounts ? HIDDEN_AMOUNT : totalSigned}
          </p>

          <div className="border-border mt-9 border-t pt-6">
            <div className="grid grid-cols-2 gap-3">
              <Mini
                label="In"
                value={
                  hideAmounts
                    ? HIDDEN_AMOUNT
                    : `+${formatMoney(monthTotals.income, settings.base_currency)}`
                }
                icon={<ArrowDownRightIcon className="size-4" />}
                tone="income"
                active={selectedKind === "income"}
                dimmed={selectedKind === "expense"}
                onClick={() => toggle("income")}
              />
              <Mini
                label="Out"
                value={
                  hideAmounts
                    ? HIDDEN_AMOUNT
                    : `-${formatMoney(monthTotals.expense, settings.base_currency)}`
                }
                icon={<ArrowUpRightIcon className="size-4" />}
                tone="expense"
                active={selectedKind === "expense"}
                dimmed={selectedKind === "income"}
                onClick={() => toggle("expense")}
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Net this month
              </span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  monthPositive ? "text-foreground" : "text-expense",
                )}
              >
                {hideAmounts ? HIDDEN_AMOUNT : monthSigned}
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="daily">
          <DaySpendView daySpend={daySpend} />
        </TabsContent>
      </Tabs>
    </Surface>
  );
}

function PeriodNav({
  label,
  canPrev,
  canNext,
  onShift,
  prevLabel,
  nextLabel,
  tabular,
}: {
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onShift: (delta: number) => void;
  prevLabel: string;
  nextLabel: string;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onShift(-1)}
        disabled={!canPrev}
        aria-label={prevLabel}
      >
        <ChevronLeftIcon />
      </Button>
      <span
        className={cn(
          "text-foreground min-w-[5.5rem] truncate text-center text-sm font-medium",
          tabular && "tabular-nums",
        )}
      >
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onShift(1)}
        disabled={!canNext}
        aria-label={nextLabel}
      >
        <ChevronRightIcon />
      </Button>
    </div>
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
            ? "bg-income text-income"
            : "bg-expense text-expense",
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
