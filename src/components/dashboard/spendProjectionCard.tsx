"use client";

import { TrendingUpIcon } from "lucide-react";

import { IconCircle } from "@/components/ui/iconCircle";
import { Surface } from "@/components/ui/surface";
import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { HIDDEN_AMOUNT } from "@/lib/preferences";

import { useSpendProjection } from "./useSpendProjection";

import type { RecurringPayment, Transaction } from "@/types/db";

export function SpendProjectionCard({
  yearMonth,
  today,
  monthTransactions,
  reminders,
  recurringNotes,
}: {
  yearMonth: string;
  today: string;
  monthTransactions: Transaction[];
  reminders: RecurringPayment[];
  recurringNotes: Set<string>;
}) {
  const settings = useSettings();
  const { hideAmounts } = useHideAmounts();
  const {
    isCurrentMonth,
    projection,
    realTotal,
    fixedPaidCount,
    fixedUpcomingCount,
  } = useSpendProjection({
    yearMonth,
    today,
    monthTransactions,
    reminders,
    recurringNotes,
  });

  function money(amount: number) {
    return hideAmounts
      ? HIDDEN_AMOUNT
      : formatMoney(amount, settings.base_currency);
  }

  return (
    <Surface padding="md">
      <div className="flex items-center gap-3">
        <IconCircle className="bg-primary/10 text-primary">
          <TrendingUpIcon className="size-4" />
        </IconCircle>
        <span className="text-eyebrow">
          {isCurrentMonth ? "Spend projection" : "Total spent"}
        </span>
      </div>

      {isCurrentMonth && projection ? (
        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-muted-foreground text-xs">
                Daily average
              </span>
              <span className="text-muted-foreground block text-[10px]">
                Daily spend only
              </span>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {money(projection.variableDailyAverage)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              Projected daily spend
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {money(projection.projectedVariable)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-muted-foreground text-xs">
                Non-daily this month
              </span>
              {projection.fixedUpcoming > 0 && (
                <span className="text-muted-foreground block text-[10px]">
                  {fixedPaidCount} paid, {fixedUpcomingCount} upcoming
                </span>
              )}
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {money(projection.fixedTotal)}
            </span>
          </div>
          <div className="border-border flex items-center justify-between border-t pt-3">
            <span className="text-base font-semibold">Projected total</span>
            <span className="text-base font-semibold tabular-nums">
              {money(projection.projectedTotal)}
            </span>
          </div>
          {projection.recurringIncomplete && (
            <p className="text-muted-foreground text-[10px]">
              Some upcoming bills in another currency could not be converted
              right now.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Spent</span>
          <span className="text-sm font-semibold tabular-nums">
            {money(realTotal ?? 0)}
          </span>
        </div>
      )}
    </Surface>
  );
}
