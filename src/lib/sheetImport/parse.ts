import type { CellValue } from "@/lib/sheetImport/workbook";
import type { DateSpec, NumberFormat } from "@/lib/sheetImport/recipe";

export const MIN_SHEET_YEAR = 1970;

const MONTH_NAMES: Record<string, number> = {
  enero: 1,
  ene: 1,
  january: 1,
  jan: 1,
  febrero: 2,
  feb: 2,
  february: 2,
  marzo: 3,
  mar: 3,
  march: 3,
  abril: 4,
  abr: 4,
  april: 4,
  apr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  june: 6,
  julio: 7,
  jul: 7,
  july: 7,
  agosto: 8,
  ago: 8,
  august: 8,
  aug: 8,
  septiembre: 9,
  setiembre: 9,
  sep: 9,
  sept: 9,
  set: 9,
  september: 9,
  octubre: 10,
  oct: 10,
  october: 10,
  noviembre: 11,
  nov: 11,
  november: 11,
  diciembre: 12,
  dic: 12,
  december: 12,
  dec: 12,
};

export function fold(value: CellValue | null | undefined): string {
  if (value === null || value === undefined) return "";
  return cellText(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

export function isBlank(value: CellValue | null): boolean {
  return value === null || (typeof value === "string" && value.trim() === "");
}

export function utcYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function cellText(value: CellValue): string {
  return value instanceof Date ? utcYmd(value) : String(value).trim();
}

function maxSheetYear(): number {
  return new Date().getUTCFullYear() + 1;
}

function isoDate(year: number, month: number, day: number): string {
  if (year < MIN_SHEET_YEAR || year > maxSheetYear()) {
    throw new Error(`year ${year} out of range`);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`invalid date ${year}-${month}-${day}`);
  }
  return utcYmd(date);
}

function fullYear(year: number): number {
  if (year >= 100) return year;
  const pivot = (maxSheetYear() % 100) + 1;
  return year < pivot ? 2000 + year : 1900 + year;
}

function requireNumber(value: number | null, label: string): number {
  if (value === null) throw new Error(`missing ${label}`);
  return value;
}

function monthOf(name: string): number | null {
  return MONTH_NAMES[name.replace(/\.$/, "")] ?? null;
}

export function sectionMonth(
  value: CellValue | null,
): { month: number; year: number | null } | null {
  if (value === null || value instanceof Date || typeof value !== "string") {
    return null;
  }
  const match = fold(value).match(/^([a-z]+\.?)(?:\s+(?:de\s+)?(\d{4}))?$/);
  const month = match ? monthOf(match[1]) : null;
  if (!match || !month) return null;
  return { month, year: match[2] ? Number(match[2]) : null };
}

function excelSerial(serial: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  const date = new Date(ms);
  return isoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function checkedCellDate(value: Date): string {
  return isoDate(
    value.getUTCFullYear(),
    value.getUTCMonth() + 1,
    value.getUTCDate(),
  );
}

function parseMonthOnly(value: CellValue, spec: DateSpec): string {
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

function parseTextDate(text: string, spec: DateSpec, dayOnly: boolean): string {
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
    /^(\d{1,2})[\s-]*(?:de\s+)?([a-z]+\.?)(?:[\s-]*(?:de\s+)?(\d{2,4}))?$/,
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
  const nameDay = text.match(/^([a-z]+\.?)\s*(\d{1,2})(?:,?\s*(\d{2,4}))?$/);
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
    throw new Error(`date ${text}`);
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

export function parseSheetDate(
  value: CellValue | null,
  spec: DateSpec,
): string {
  if (value === null) throw new Error("empty date");
  if (spec.kind === "month") return parseMonthOnly(value, spec);
  if (value instanceof Date) return checkedCellDate(value);
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
  return parseTextDate(text, spec, dayOnly);
}

const CURRENCY_CODE_EDGE = /^[a-z]{2,3}\s*|\s*[a-z]{2,3}$/gi;

export function parseSheetAmount(
  value: CellValue | null,
  format: NumberFormat,
): number | null {
  if (value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value !== "string") throw new Error(`amount ${String(value)}`);
  const original = value.trim();
  if (/^[-\u2013\u2014\s]*$/.test(original)) return null;
  const text = original
    .replace(/−/g, "-")
    .replace(/\p{Sc}/gu, "")
    .replace(CURRENCY_CODE_EDGE, "")
    .trim();
  if (!/^[\d.,\s'  ()+-]+$/.test(text) || !/\d/.test(text)) {
    throw new Error(`amount ${original}`);
  }
  const negative =
    /^[^\d]*-/.test(text) ||
    /-\s*$/.test(text) ||
    /\([^)]*\d[^)]*\)/.test(text);
  let digits = text.replace(/[^\d.,\s'  ]/g, "");
  if (format.thousands) digits = digits.split(format.thousands).join("");
  digits = digits.replace(/[\s'  ]/g, "");
  digits =
    format.decimal === "."
      ? digits.replace(/,/g, "")
      : digits.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(digits)) throw new Error(`amount ${original}`);
  const amount = Number(digits);
  return negative ? -amount : amount;
}
