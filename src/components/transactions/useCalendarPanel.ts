"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatYm, monthBounds, parseYmd } from "@/lib/dates";

import type { DayTotalsWithPairs } from "@/lib/cancellations";
import type { RecurringPayment } from "@/types/db";

import { useDrawerStep } from "./drawerStepContext";
import { usePayFlow } from "./usePayFlow";

type ReminderScope = "month" | "all" | "done";

export function useCalendarPanel({
  open,
  yearMonth,
  selectedDay,
  selectedDayGroup,
  reminders,
  completedReminders,
  today,
}: {
  open: boolean;
  yearMonth: string;
  selectedDay: string | null;
  selectedDayGroup: DayTotalsWithPairs | null;
  reminders: RecurringPayment[];
  completedReminders: RecurringPayment[];
  today: string;
}) {
  const defaultMonth = parseYmd(`${yearMonth}-01`);
  const selected = selectedDay ? parseYmd(selectedDay) : undefined;

  const [visibleMonth, setVisibleMonth] = useState<Date>(defaultMonth);
  const [reminderScope, setReminderScope] = useState<ReminderScope>("month");
  const visibleYearMonth = formatYm(visibleMonth);
  const payFlow = usePayFlow(today);

  useEffect(() => {
    if (!open) payFlow.close();
  }, [open, payFlow]);

  const stepApi = useDrawerStep();
  const payFlowRef = useRef(payFlow);

  useEffect(() => {
    payFlowRef.current = payFlow;
  }, [payFlow]);

  useEffect(() => {
    if (!stepApi) return;
    return stepApi.registerBack(() => {
      const flow = payFlowRef.current;
      if (!flow.activeReminder) return false;
      if (flow.step === "form") {
        flow.backToCandidates();
        return true;
      }
      flow.close();
      return true;
    });
  }, [stepApi]);

  const [shownDay, setShownDay] = useState<DayTotalsWithPairs | null>(
    selectedDayGroup,
  );
  if (selectedDayGroup && selectedDayGroup !== shownDay) {
    setShownDay(selectedDayGroup);
  }

  const shownReminders = useMemo(() => {
    if (reminderScope === "done") return completedReminders;
    const sorted = [...reminders].sort((a, b) =>
      a.next_due_on.localeCompare(b.next_due_on),
    );
    if (reminderScope === "all") return sorted;
    const [start, end] = monthBounds(visibleYearMonth);
    return sorted.filter((r) => r.next_due_on >= start && r.next_due_on <= end);
  }, [reminders, completedReminders, reminderScope, visibleYearMonth]);

  return {
    defaultMonth,
    selected,
    visibleMonth,
    setVisibleMonth,
    reminderScope,
    setReminderScope,
    visibleYearMonth,
    payFlow,
    shownDay,
    shownReminders,
  };
}
