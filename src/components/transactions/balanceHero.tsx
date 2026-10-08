"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { RateEstimate } from "@/components/ui/rateEstimate";
import { Surface } from "@/components/ui/surface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHideAmounts } from "@/hooks/useHideAmounts";
import { formatStat } from "@/lib/currency";
import { formatYearMonthShort } from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { Transaction } from "@/types/db";

import { AmountsToggle } from "./amountsToggle";
import { DaySpendView } from "./daySpendView";
import { MiniStat } from "./miniStat";
import { PeriodNav } from "./periodNav";
import { TodayButton } from "./todayButton";
import { useBalanceHero } from "./useBalanceHero";

import type { useDaySpend } from "./useDaySpend";

export type KindFilter = "all" | "income" | "expense";
export type HeroView = "monthly" | "daily";

interface Props {
  yearMonth: string;
  transactions: Transaction[];
  lifetimeTransactions: Transaction[];
  includeTransfers?: boolean;
  selectedKind: KindFilter;
  onKindChange: (next: KindFilter) => void;
  hasOlder: boolean;
  hasNewer: boolean;
  onShiftMonth: (delta: number) => void;
  onCurrentMonth?: () => void;
  onToday?: () => void;
  view: HeroView;
  onViewChange: (next: HeroView) => void;
  daySpend: ReturnType<typeof useDaySpend>;
  costBasisSources: string[];
}

export function BalanceHero({
  yearMonth,
  transactions,
  lifetimeTransactions,
  includeTransfers = false,
  selectedKind,
  onKindChange,
  hasOlder,
  hasNewer,
  onShiftMonth,
  onCurrentMonth,
  onToday,
  view,
  onViewChange,
  daySpend,
  costBasisSources,
}: Props) {
  const { mask } = useHideAmounts();
  const {
    displayCurrency,
    monthTotals,
    totalPositive,
    totalSigned,
    showBase,
    totalInBase,
    totalAtTodaysRate,
    ratesStale,
    incomeInBase,
    expenseInBase,
    netInBase,
    monthPositive,
    monthSigned,
  } = useBalanceHero({
    transactions,
    lifetimeTransactions,
    includeTransfers,
    costBasisSources,
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-eyebrow">Total balance</span>
              <AmountsToggle />
            </div>
            {onCurrentMonth && <TodayButton onClick={onCurrentMonth} />}
          </div>
          <p
            className={cn(
              "font-heading text-[clamp(2rem,9vw,2.75rem)] leading-[1.05] font-semibold tracking-tight tabular-nums",
              totalPositive ? "text-foreground" : "text-expense",
            )}
          >
            {mask(totalSigned)}
          </p>
          {showBase && (
            <p className="mt-1 h-4">
              {totalInBase && (
                <RateEstimate
                  value={mask(totalInBase)}
                  showRate={totalAtTodaysRate}
                  stale={ratesStale}
                  variant="hint"
                />
              )}
            </p>
          )}

          <div className="border-border mt-9 border-t pt-6">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="In"
                value={mask(
                  `+${formatStat(monthTotals.income, displayCurrency)}`,
                )}
                hint={
                  incomeInBase && (
                    <RateEstimate value={mask(incomeInBase)} showRate={false} />
                  )
                }
                icon={<ArrowDownRightIcon className="size-4" />}
                tone="income"
                active={selectedKind === "income"}
                dimmed={selectedKind === "expense"}
                onClick={() => toggle("income")}
              />
              <MiniStat
                label="Out"
                value={mask(
                  `-${formatStat(monthTotals.expense, displayCurrency)}`,
                )}
                hint={
                  expenseInBase && (
                    <RateEstimate
                      value={mask(expenseInBase)}
                      showRate={false}
                    />
                  )
                }
                icon={<ArrowUpRightIcon className="size-4" />}
                tone="expense"
                active={selectedKind === "expense"}
                dimmed={selectedKind === "income"}
                onClick={() => toggle("expense")}
              />
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-muted-foreground text-xs">
                Net this month
              </span>
              <span className="grid justify-items-end">
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    monthPositive ? "text-foreground" : "text-expense",
                  )}
                >
                  {mask(monthSigned)}
                </span>
                {netInBase && (
                  <RateEstimate
                    value={mask(netInBase)}
                    showRate={false}
                    variant="hint"
                  />
                )}
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="daily">
          <DaySpendView daySpend={daySpend} onToday={onToday} />
        </TabsContent>
      </Tabs>
    </Surface>
  );
}
