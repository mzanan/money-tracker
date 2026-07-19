"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

import type { DayTotalsWithPairs } from "@/lib/cancellations";

import { DayGroup } from "./dayGroup";

export function DaySection({
  day,
  onClose,
}: {
  day: DayTotalsWithPairs;
  onClose: () => void;
}) {
  return (
    <Surface radius="lg" padding="list">
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
      {day.transactions.length + day.pairs.length > 0 ? (
        <DayGroup day={day} />
      ) : (
        <p className="text-muted-foreground px-3 py-6 text-center text-sm">
          No transactions on this day.
        </p>
      )}
    </Surface>
  );
}
