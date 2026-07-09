import type { RecurringPayment } from "@/types/db";

const PRODID = "-//money-tracker//Reminders//EN";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function dateOnly(yyyyMmDd: string): string {
  return yyyyMmDd.replace(/-/g, "");
}

function addOneDay(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map((s) => parseInt(s, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 1);
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
}

function utcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  );
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function rrule(reminder: RecurringPayment): string | null {
  switch (reminder.frequency) {
    case "WEEKLY":
      return "FREQ=WEEKLY";
    case "MONTHLY":
      return "FREQ=MONTHLY";
    case "YEARLY":
      return "FREQ=YEARLY";
    case "CUSTOM_MONTHS": {
      const n = reminder.interval_months ?? 1;
      return `FREQ=MONTHLY;INTERVAL=${Math.max(1, n)}`;
    }
    default:
      return null;
  }
}

function describe(reminder: RecurringPayment): string {
  const parts: string[] = [];
  if (reminder.amount != null && reminder.currency) {
    parts.push(`${reminder.currency} ${reminder.amount}`);
  } else if (reminder.amount != null) {
    parts.push(String(reminder.amount));
  }
  if (reminder.note) parts.push(reminder.note);
  if (reminder.source) parts.push(`Source: ${reminder.source}`);
  return parts.join("\n");
}

function eventLines(reminder: RecurringPayment, stamp: string): string[] {
  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:reminder-${reminder.id}@money-tracker`);
  lines.push(`DTSTAMP:${stamp}`);
  lines.push(`DTSTART;VALUE=DATE:${dateOnly(reminder.next_due_on)}`);
  lines.push(`DTEND;VALUE=DATE:${addOneDay(reminder.next_due_on)}`);
  lines.push(`SUMMARY:${escapeText(reminder.label)}`);
  const description = describe(reminder);
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  const rule = rrule(reminder);
  if (rule) lines.push(`RRULE:${rule}`);
  lines.push("TRANSP:TRANSPARENT");
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcsFeed(
  reminders: RecurringPayment[],
  opts: { calendarName?: string } = {},
): string {
  const stamp = utcStamp(new Date());
  const name = opts.calendarName ?? "Money Tracker reminders";

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(`PRODID:${PRODID}`);
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${escapeText(name)}`);
  lines.push(`X-WR-CALDESC:${escapeText("Recurring payment reminders")}`);

  for (const reminder of reminders) {
    if (!reminder.active) continue;
    lines.push(...eventLines(reminder, stamp));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
