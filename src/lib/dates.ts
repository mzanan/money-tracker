import { format, parse } from "date-fns";
import { enUS } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

export function todayInTz(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

export function thisYearMonth(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM");
}

export function monthBounds(yearMonth: string): [string, string] {
  const start = `${yearMonth}-01`;
  const date = parse(start, "yyyy-MM-dd", new Date());
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return [start, end];
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const date = parse(`${yearMonth}-01`, "yyyy-MM-dd", new Date());
  date.setMonth(date.getMonth() + delta);
  return format(date, "yyyy-MM");
}

export function formatDayLong(yyyymmdd: string): string {
  const today = format(new Date(), "yyyy-MM-dd");
  if (yyyymmdd === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (yyyymmdd === format(yesterday, "yyyy-MM-dd")) return "Yesterday";
  const date = parse(yyyymmdd, "yyyy-MM-dd", new Date());
  return format(date, "EEEE, MMMM d", { locale: enUS });
}

export function formatYearMonthLong(yearMonth: string): string {
  const date = parse(`${yearMonth}-01`, "yyyy-MM-dd", new Date());
  return format(date, "MMMM yyyy", { locale: enUS });
}

export function isValidYearMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function oldestYearMonthFrom(
  rows: ReadonlyArray<{ occurred_on: string }>,
): string | null {
  if (rows.length === 0) return null;
  let oldest = rows[0].occurred_on;
  for (const row of rows) {
    if (row.occurred_on < oldest) oldest = row.occurred_on;
  }
  return oldest.slice(0, 7);
}

export function getSupportedTimezones(): string[] {
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    return intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
}
