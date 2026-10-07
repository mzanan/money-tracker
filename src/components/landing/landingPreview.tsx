import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { Avatar } from "@/components/transactions/avatar";
import { MiniStat } from "@/components/transactions/miniStat";
import { ListRow } from "@/components/ui/listRow";
import { Surface } from "@/components/ui/surface";
import { formatMoney, kindSign } from "@/lib/currency";
import { ROW_STAGGER_MS, enterUpClasses, staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

import landingCopy from "./landing.json";
import { Ticker } from "./ticker";

const preview = landingCopy.preview;

export function LandingPreview({ firstStep }: { firstStep: number }) {
  return (
    <div
      aria-hidden
      className="grid w-full gap-4 text-left select-none sm:grid-cols-2"
    >
      <Surface
        padding="lg"
        style={staggerDelay(firstStep)}
        className={cn(
          "ring-border shadow-primary/10 shadow-2xl ring-1",
          enterUpClasses,
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="text-eyebrow">{preview.balanceLabel}</span>
          <Ticker
            items={preview.months.map((month) => month.label)}
            className="text-muted-foreground text-sm tabular-nums"
          />
        </div>
        <Ticker
          items={preview.months.map((month) =>
            formatMoney(month.balance, preview.currency, { signed: true }),
          )}
          className="font-heading block text-[clamp(2rem,9vw,2.75rem)] leading-[1.05] font-semibold tracking-tight tabular-nums"
        />
        <div className="border-border mt-9 grid grid-cols-2 gap-3 border-t pt-6">
          <MiniStat
            label="In"
            value={
              <Ticker
                items={preview.months.map(
                  (month) => `+${formatMoney(month.income, preview.currency)}`,
                )}
              />
            }
            icon={<ArrowDownRightIcon className="size-4" />}
            tone="income"
          />
          <MiniStat
            label="Out"
            value={
              <Ticker
                items={preview.months.map(
                  (month) => `-${formatMoney(month.expense, preview.currency)}`,
                )}
              />
            }
            icon={<ArrowUpRightIcon className="size-4" />}
            tone="expense"
          />
        </div>
      </Surface>

      <Surface
        padding="lg"
        style={staggerDelay(firstStep + 1)}
        className={cn(
          "ring-border shadow-primary/10 shadow-2xl ring-1",
          enterUpClasses,
        )}
      >
        <span className="text-eyebrow mb-4 block">{preview.dayLabel}</span>
        <div className="flex flex-col gap-6">
          {preview.rows.map((row, index) => (
            <div
              key={row.note}
              style={staggerDelay(index, ROW_STAGGER_MS)}
              className="animate-row-in fill-mode-both motion-reduce:animate-none"
            >
              <ListRow
                leading={<Avatar seed={row.note} />}
                title={row.source}
                meta={row.note}
              >
                <span className="flex shrink-0 flex-col items-end tabular-nums">
                  <span
                    className={cn(
                      "text-sm leading-tight font-semibold",
                      row.kind === "income" ? "text-income" : "text-foreground",
                    )}
                  >
                    {kindSign(row.kind)}
                    {formatMoney(row.converted, preview.currency)}
                  </span>
                  {row.currency !== preview.currency && (
                    <span className="text-muted-foreground text-caption mt-0.5">
                      {formatMoney(row.amount, row.currency)}
                    </span>
                  )}
                </span>
              </ListRow>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
