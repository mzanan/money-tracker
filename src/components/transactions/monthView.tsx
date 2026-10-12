"use client";

import { Loader2Icon, ListChecksIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { Surface } from "@/components/ui/surface";

import type { MovementScope } from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

import { CarriedOverGroup } from "./carriedOverGroup";
import { DayGroup } from "./dayGroup";
import { useMonthView } from "./useMonthView";

export function MonthView({
  movements,
  movedOut = [],
  emptyLabel = "No transactions this month.",
  scope,
  groupCarriedOver = true,
  dayTotalsCurrency,
  recurringNotes,
}: {
  movements: Movement[];
  movedOut?: Movement[];
  emptyLabel?: string;
  scope: MovementScope;
  groupCarriedOver?: boolean;
  dayTotalsCurrency?: string;
  recurringNotes?: Set<string>;
}) {
  const {
    dayCurrency,
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
  } = useMonthView(
    movements,
    scope,
    movedOut,
    groupCarriedOver,
    dayTotalsCurrency,
  );

  if (days.length === 0 && carriedOverGroups.length === 0) {
    return (
      <Surface
        padding="none"
        className="text-muted-foreground py-16 text-center text-sm"
      >
        {emptyLabel}
      </Surface>
    );
  }

  return (
    <Surface padding="list">
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
      {days.length === 0 && (
        <EmptyState className="px-3 py-8 text-center">{emptyLabel}</EmptyState>
      )}
      {shown.map((day) => (
        <DayGroup
          key={day.date}
          day={day}
          open={effectiveOpen.includes(day.date)}
          onToggle={() => toggleDay(day.date)}
          recurringNotes={recurringNotes}
          currency={dayCurrency}
          scope={scope}
        />
      ))}
      {carriedOverGroups.map((group) => (
        <CarriedOverGroup
          key={group.month}
          group={group}
          currency={dayCurrency}
          scope={scope}
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
