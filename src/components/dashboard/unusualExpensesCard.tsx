"use client";

import { AlertTriangleIcon } from "lucide-react";

import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useSettings } from "@/hooks/useSettings";
import { formatMoney } from "@/lib/currency";
import { formatDayShort } from "@/lib/dates";
import { HIDDEN_AMOUNT } from "@/lib/preferences";

import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/iconCircle";
import { ListRow } from "@/components/ui/listRow";
import { Surface } from "@/components/ui/surface";

import { useUnusualExpenses } from "./useUnusualExpenses";

import type { Transaction } from "@/types/db";

export function UnusualExpensesCard({
  monthTransactions,
  recurringNotes,
}: {
  monthTransactions: Transaction[];
  recurringNotes: Set<string>;
}) {
  const settings = useSettings();
  const { hideAmounts } = useHideAmounts();
  const { rows, isRowPending, markOneOff, markRegular } = useUnusualExpenses(
    monthTransactions,
    recurringNotes,
  );

  function money(value: number) {
    return hideAmounts
      ? HIDDEN_AMOUNT
      : formatMoney(value, settings.base_currency);
  }

  if (rows.length === 0) return null;

  return (
    <Surface padding="md" className="grid gap-3">
      <div className="flex items-center gap-3">
        <IconCircle className="bg-primary/10 text-primary">
          <AlertTriangleIcon className="size-4" />
        </IconCircle>
        <span className="text-eyebrow">Daily or not?</span>
      </div>
      <p className="text-muted-foreground text-xs">
        These are well above your usual spend. Non-daily costs like rent or a
        one-off purchase stay out of the daily average.
      </p>
      <div className="divide-border grid divide-y">
        {rows.map(({ tx, value, title }) => (
          <ListRow
            key={tx.id}
            title={title}
            meta={`${formatDayShort(tx.occurred_on)} · ${money(value)}`}
          >
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={isRowPending(tx.id)}
                onClick={() => markRegular(tx)}
              >
                Daily
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={isRowPending(tx.id)}
                onClick={() => markOneOff(tx)}
              >
                Not daily
              </Button>
            </div>
          </ListRow>
        ))}
      </div>
    </Surface>
  );
}
