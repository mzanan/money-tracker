"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { useRates } from "@/hooks/useRates";
import { useSettings } from "@/hooks/useSettings";
import {
  MONTH_INITIAL_DAYS,
  MONTH_STEP_DAYS,
} from "@/lib/constants/pagination";
import { dayTotalsList } from "@/lib/totals";
import { useUiStore } from "@/stores/uiStore";

import type { Transaction } from "@/types/db";

import { DayGroup } from "./dayGroup";

export function MonthView({ transactions }: { transactions: Transaction[] }) {
  const settings = useSettings();
  const ratesQuery = useRates();
  const displayMode = useUiStore((state) => state.displayMode);
  const [visibleDays, setVisibleDays] = useState(MONTH_INITIAL_DAYS);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const days = useMemo(
    () =>
      dayTotalsList(
        transactions,
        settings.base_currency,
        displayMode,
        ratesQuery.data?.rates,
      ),
    [transactions, settings.base_currency, displayMode, ratesQuery.data],
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
      <div className="bg-card text-muted-foreground rounded-2xl py-16 text-center text-sm">
        No transactions this month.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl px-1 py-1">
      {shown.map((day) => (
        <DayGroup key={day.date} day={day} />
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
    </div>
  );
}
