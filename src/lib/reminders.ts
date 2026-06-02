import { addMonths, addWeeks, addYears, format, parseISO } from "date-fns";

import type { RecurringFrequency } from "@/types/db";

export const FREQUENCY_OPTIONS: {
  value: RecurringFrequency;
  label: string;
}[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM_MONTHS", label: "Every N months" },
];

export function computeNextDue(
  fromIso: string,
  frequency: RecurringFrequency,
  intervalMonths?: number | null,
): string {
  const date = parseISO(fromIso);
  let next: Date;
  switch (frequency) {
    case "WEEKLY":
      next = addWeeks(date, 1);
      break;
    case "YEARLY":
      next = addYears(date, 1);
      break;
    case "CUSTOM_MONTHS":
      next = addMonths(date, Math.max(1, intervalMonths ?? 1));
      break;
    case "MONTHLY":
    default:
      next = addMonths(date, 1);
      break;
  }
  return format(next, "yyyy-MM-dd");
}

export function frequencyLabel(
  frequency: RecurringFrequency,
  intervalMonths?: number | null,
): string {
  switch (frequency) {
    case "WEEKLY":
      return "Weekly";
    case "MONTHLY":
      return "Monthly";
    case "YEARLY":
      return "Yearly";
    case "CUSTOM_MONTHS":
      return `Every ${Math.max(1, intervalMonths ?? 1)} months`;
  }
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = parseISO(fromIso).getTime();
  const to = parseISO(toIso).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function dueSoon<T extends { next_due_on: string }>(
  reminders: readonly T[],
  today: string,
  withinDays = 7,
): T[] {
  return reminders
    .filter((r) => daysBetween(today, r.next_due_on) <= withinDays)
    .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
}

export function dueLabel(nextDueOn: string, todayIso: string): string {
  const diff = daysBetween(todayIso, nextDueOn);
  if (diff < 0) {
    const n = Math.abs(diff);
    return n === 1 ? "Overdue by 1 day" : `Overdue by ${n} days`;
  }
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 30) return `Due in ${diff} days`;
  const months = Math.round(diff / 30);
  return months <= 1 ? "Due in ~1 month" : `Due in ~${months} months`;
}
