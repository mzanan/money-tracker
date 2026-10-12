"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

import { ALL_SOURCES } from "@/lib/constants/sources";
import type { DayTotals } from "@/lib/ledger/days";

import { DayGroup } from "./dayGroup";

export function DaySection({
  day,
  currency,
  onClose,
}: {
  day: DayTotals;
  currency?: string;
  onClose: () => void;
}) {
  return (
    <Surface padding="list">
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <span className="text-eyebrow">Selected day</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Clear selected day"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
      {day.movements.length + day.pairs.length > 0 ? (
        <DayGroup
          day={day}
          currency={currency}
          scope={ALL_SOURCES}
          showBudgetMonthBadges={false}
        />
      ) : (
        <p className="text-muted-foreground px-3 py-6 text-center text-sm">
          No transactions on this day.
        </p>
      )}
    </Surface>
  );
}
