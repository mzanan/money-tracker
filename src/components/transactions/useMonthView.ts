"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useSettings } from "@/hooks/useSettings";
import { dayTotalsWithPairs } from "@/lib/cancellations";
import {
  groupCarriedOverByMonth,
  mergeMovedOutIntoDays,
  partitionCarriedOver,
} from "@/lib/budgetMonth";
import {
  MONTH_INITIAL_DAYS,
  MONTH_STEP_DAYS,
} from "@/lib/constants/pagination";
import { useUiStore } from "@/stores/uiStore";

import type { Transaction } from "@/types/db";

export function useMonthView(
  transactions: Transaction[],
  includeTransfers = false,
  movedOut: Transaction[] = [],
) {
  const settings = useSettings();
  const txSelectMode = useUiStore((s) => s.txSelectMode);
  const setTxSelectMode = useUiStore((s) => s.setTxSelectMode);
  const [visibleDays, setVisibleDays] = useState(MONTH_INITIAL_DAYS);
  const [openState, setOpenState] = useState<{
    key: string | undefined;
    dates: string[] | null;
  }>({ key: undefined, dates: null });
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { native, carriedOver } = useMemo(
    () => partitionCarriedOver(transactions),
    [transactions],
  );
  const carriedOverGroups = useMemo(
    () => groupCarriedOverByMonth(carriedOver),
    [carriedOver],
  );

  const nativeDays = useMemo(
    () =>
      dayTotalsWithPairs(native, settings.base_currency, includeTransfers),
    [native, settings.base_currency, includeTransfers],
  );
  const days = useMemo(
    () => mergeMovedOutIntoDays(nativeDays, movedOut),
    [nativeDays, movedOut],
  );

  const shown = days.slice(0, visibleDays);
  const hasMore = shown.length < days.length;

  const firstDate = days[0]?.date;
  if (openState.key !== firstDate) {
    setOpenState({ key: firstDate, dates: null });
  }

  const effectiveOpen = openState.dates ?? (firstDate ? [firstDate] : []);

  function toggleDay(date: string) {
    setOpenState({
      key: firstDate,
      dates: effectiveOpen.includes(date)
        ? effectiveOpen.filter((d) => d !== date)
        : [...effectiveOpen, date],
    });
  }

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

  return {
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
  };
}
