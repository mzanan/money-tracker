"use client";

import { Loader2Icon, ListChecksIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

import type { Transaction } from "@/types/db";

import { CarriedOverGroup } from "./carriedOverGroup";
import { DayGroup } from "./dayGroup";
import { useMonthView } from "./useMonthView";

export function MonthView({
  transactions,
  movedOut = [],
  emptyLabel = "No transactions this month.",
  includeTransfers = false,
}: {
  transactions: Transaction[];
  movedOut?: Transaction[];
  emptyLabel?: string;
  includeTransfers?: boolean;
}) {
  const {
    days,
    carriedOverGroups,
    shown,
    hasMore,
    sentinelRef,
    effectiveOpen,
    firstDate,
    toggleDay,
    txSelectMode,
    setTxSelectMode,
  } = useMonthView(transactions, includeTransfers, movedOut);

  if (days.length === 0 && carriedOverGroups.length === 0) {
    return (
      <Surface
        radius="lg"
        padding="none"
        className="text-muted-foreground py-16 text-center text-sm"
      >
        {emptyLabel}
      </Surface>
    );
  }

  return (
    <Surface radius="lg" padding="list">
      <div className="flex justify-end px-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={txSelectMode}
          onClick={() => {
            if (!txSelectMode && effectiveOpen.length === 0 && firstDate) {
              toggleDay(firstDate);
            }
            setTxSelectMode(!txSelectMode);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ListChecksIcon />
          {txSelectMode ? "Done" : "Merge duplicates"}
        </Button>
      </div>
      {carriedOverGroups.map((group) => (
        <CarriedOverGroup key={group.month} group={group} />
      ))}
      {shown.map((day) => (
        <DayGroup
          key={day.date}
          day={day}
          open={effectiveOpen.includes(day.date)}
          onToggle={() => toggleDay(day.date)}
        />
      ))}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="text-muted-foreground flex items-center justify-center gap-2 p-6 text-xs"
        >
          <Loader2Icon className="size-3.5 animate-spin" />
          Loading more
        </div>
      )}
    </Surface>
  );
}
