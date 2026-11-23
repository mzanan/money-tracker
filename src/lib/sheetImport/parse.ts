import type { CellValue } from "@/lib/sheetImport/workbook";
import type { DateSpec, NumberFormat } from "@/lib/sheetImport/recipe";

const MONTHS: Record<string, number> = {
  ene: 1,
  jan: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  aug: 8,
  sep: 9,
  set: 9,
  oct: 10,
  nov: 11,
  dic: 12,
  dec: 12,
};

export function fold(value: CellValue | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

export function isBlank(value: CellValue | null): boolean {
  return value === null || (typeof value === "string" && value.trim() === "");
}

function isoDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`invalid date ${year}-${month}-${day}`);
  }
  return date.toISOString().slice(0, 10);
}

function fullYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function requireNumber(value: number | null, label: string): number {
  if (value === null) throw new Error(`missing ${label}`);
  return value;
}

function monthOf(name: string): number | null {
  return MONTHS[name.slice(0, 3)] ?? null;
}

export function sectionMonth(
  value: CellValue | null,
): { month: number; year: number | null } | null {
  const match = fold(value).match(/^([a-z]+)(?:\s+(?:de\s+)?(\d{4}))?$/);
  const month = match ? monthOf(match[1]) : null;
  if (!match || !month) return null;
  return { month, year: match[2] ? Number(match[2]) : null };
}

function dateFromCell(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function excelSerial(serial: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function parseSheetDate(
  value: CellValue | null,
  spec: DateSpec,
): string {
  if (value === null) throw new Error("empty date");
  if (spec.kind === "month") {
    if (value instanceof Date) {
      return isoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, 1);
    }
    if (typeof value === "number") {
      return isoDate(requireNumber(spec.year, "year"), value, 1);
    }
    const found = sectionMonth(value);
    if (!found) throw new Error(`month ${String(value)}`);
    return isoDate(
      found.year ?? requireNumber(spec.year, "year"),
      found.month,
      1,
    );
  }
  if (value instanceof Date) return dateFromCell(value);
  const dayOnly =
    spec.kind === "day_of_month" || spec.kind === "day_with_section_month";
  if (typeof value === "number") {
    if (dayOnly) {
      return isoDate(
        requireNumber(spec.year, "year"),
        requireNumber(spec.month, "month"),
        value,
      );
    }
    return excelSerial(value);
  }
  const text = fold(value);
  if (!text) throw new Error("empty date");
  if (dayOnly && /^\d{1,2}$/.test(text)) {
    return isoDate(
      requireNumber(spec.year, "year"),
      requireNumber(spec.month, "month"),
      Number(text),
    );
  }
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dayName = text.match(
    /^(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?(?:\s*(?:de\s+)?(\d{2,4}))?$/,
  );
  if (dayName && monthOf(dayName[2])) {
    const year = dayName[3]
      ? Number(dayName[3])
      : requireNumber(spec.year, "year");
    return isoDate(
      fullYear(year),
      monthOf(dayName[2]) as number,
      Number(dayName[1]),
    );
  }
  const nameDay = text.match(/^([a-z]+)\.?\s*(\d{1,2})(?:,?\s*(\d{2,4}))?$/);
  if (nameDay && monthOf(nameDay[1])) {
    const year = nameDay[3]
      ? Number(nameDay[3])
      : requireNumber(spec.year, "year");
    return isoDate(
      fullYear(year),
      monthOf(nameDay[1]) as number,
      Number(nameDay[2]),
    );
  }
  const parts = text.split(/[/\-.\s]+/);
  if (
    !parts.every((p) => /^\d+$/.test(p)) ||
    (parts.length !== 2 && parts.length !== 3)
  ) {
    throw new Error(`date ${String(value)}`);
  }
  const numbers = parts.map(Number);
  if (numbers.length === 2) {
    const year = requireNumber(spec.year, "year");
    if (spec.order === "ymd") numbers.unshift(year);
    else numbers.push(year);
  }
  const fields: Record<string, number> = {};
  spec.order.split("").forEach((key, i) => {
    fields[key] = numbers[i];
  });
  return isoDate(fullYear(fields.y), fields.m, fields.d);
}

export function parseSheetAmount(
  value: CellValue | null,
  format: NumberFormat,
): number | null {
  if (value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value !== "string") throw new Error(`amount ${String(value)}`);
  const text = value.trim();
  if (!text) return null;
  const negative =
    text.startsWith("-") ||
    text.endsWith("-") ||
    (text.startsWith("(") && text.endsWith(")"));
  let cleaned = text.replace(/[^\d.,\s']/g, "");
  if (format.thousands) cleaned = cleaned.split(format.thousands).join("");
  cleaned = cleaned.replace(/[\s']/g, "");
  cleaned =
    format.decimal === "."
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw new Error(`amount ${text}`);
  const amount = Number(cleaned);
  return negative ? -amount : amount;
}
