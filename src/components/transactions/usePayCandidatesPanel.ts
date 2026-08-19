"use client";

import { useEffect, useState } from "react";

import { daysBefore, formatDayLong, parseYmd } from "@/lib/dates";

interface Props {
  day: string;
  today: string;
  loading: boolean;
  onChooseDay: (day: string) => void;
}

export function usePayCandidatesPanel({
  day,
  today,
  loading,
  onChooseDay,
}: Props) {
  const [month, setMonth] = useState(() => parseYmd(day));
  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => setShowLoading(true), 150);
    return () => {
      clearTimeout(timeout);
      setShowLoading(false);
    };
  }, [loading]);
  const yesterday = daysBefore(today, 1);
  const isToday = day === today;
  const isYesterday = day === yesterday;
  const dayLabel = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : formatDayLong(day);

  function pickDay(next: string) {
    setMonth(parseYmd(next));
    onChooseDay(next);
  }

  return {
    month,
    setMonth,
    showLoading,
    yesterday,
    isToday,
    isYesterday,
    dayLabel,
    pickDay,
  };
}
