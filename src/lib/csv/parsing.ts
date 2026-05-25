import type { DateFormat } from "@/lib/csvPresets";

export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/[A-Za-z_]/.test(trimmed)) return null;
  const cleaned = trimmed
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "");
  if (!/\d/.test(cleaned)) return null;
  const normalized = cleaned.replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

export function parseDate(
  raw: string | undefined,
  format: DateFormat,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (format === "iso") {
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (!isoMatch) return null;
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const parts = trimmed.split(/[-/.\s]/).filter(Boolean);
  if (parts.length < 3) return null;
  let day: string, month: string, year: string;
  if (format === "dmy") {
    [day, month, year] = parts;
  } else {
    [month, day, year] = parts;
  }
  if (year.length === 2) year = `20${year}`;
  if (
    !/^\d{4}$/.test(year) ||
    !/^\d{1,2}$/.test(month) ||
    !/^\d{1,2}$/.test(day)
  ) {
    return null;
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function parseDateTime(
  raw: string | undefined,
  date: string,
): string | undefined {
  if (!raw) return undefined;
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!timeMatch) return undefined;
  const h = timeMatch[1].padStart(2, "0");
  const m = timeMatch[2];
  const s = (timeMatch[3] ?? "00").padStart(2, "0");
  return `${date}T${h}:${m}:${s}Z`;
}

export function addOneDay(yyyymmdd: string): string {
  const d = new Date(`${yyyymmdd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
