"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import {
  MONTH_INITIAL_DAYS,
  MONTH_STEP_DAYS,
} from "@/lib/constants/pagination";
import { Surface } from "@/components/ui/surface";
import { dayTotalsList } from "@/lib/totals";

import type { Transaction } from "@/types/db";

import { DayGroup } from "./dayGroup";

export function MonthView({
  transactions,
  emptyLabel = "No transactions this month.",
}: {
  transactions: Transaction[];
  emptyLabel?: string;
}) {
  const settings = useSettings();
  const [visibleDays, setVisibleDays] = useState(MONTH_INITIAL_DAYS);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const days = useMemo(
    () => dayTotalsList(transactions, settings.base_currency),
    [transactions, settings.base_currency],
  );

  const shown = days.slice(0, visibleDays);
  const hasMore = shown.length < days.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleDays((v) => Math.min(v + MONTH_STEP_DAYS, days.length));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, days.length]);

  if (days.length === 0) {
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
      {shown.map((day, index) => (
        <DayGroup key={day.date} day={day} defaultOpen={index === 0} />
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
