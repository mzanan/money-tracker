"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { RateEstimate } from "@/components/ui/rateEstimate";
import { Surface } from "@/components/ui/surface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHideAmounts } from "@/hooks/useHideAmounts";
import { formatStat } from "@/lib/currency";
import { formatYearMonthShort } from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { MovementScope } from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

import { AmountsToggle } from "./amountsToggle";
import { BalanceLine } from "./balanceLine";
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
  movements: Movement[];
  lifetimeMovements: Movement[];
  scope: MovementScope;
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
}

export function BalanceHero({
  yearMonth,
  movements,
  lifetimeMovements,
  scope,
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
}: Props) {
  const { mask } = useHideAmounts();
  const {
    displayCurrency,
    monthTotals,
    totalPositive,
    totalSigned,
    showBase,
    totalInBase,
    incomeInBase,
    expenseInBase,
    netInBase,
    monthPositive,
    monthSigned,
  } = useBalanceHero({
    yearMonth,
    movements,
    lifetimeMovements,
    scope,
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
                  showRate={false}
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

            <div className="mt-4 grid gap-2">
              <BalanceLine
                label="Net this month"
                value={mask(monthSigned)}
                positive={monthPositive}
                hint={
                  netInBase && (
                    <RateEstimate
                      value={mask(netInBase)}
                      showRate={false}
                      variant="hint"
                    />
                  )
                }
              />
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
