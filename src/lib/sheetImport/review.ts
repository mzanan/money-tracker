import type { CsvRow } from "@/lib/actions/csvImport";
import { isSupportedCurrency } from "@/lib/constants/currencies";
import type { SheetRow, SheetRowIssue } from "@/lib/sheetImport/apply";
import { fingerprintOccurrences } from "@/lib/sheetImport/occurrence";

export const SHEET_REQUEST_ROWS = 500;

export interface ReviewRow extends SheetRow {
  occurrence: number;
}

export function reviewRows(rows: SheetRow[]): ReviewRow[] {
  const occurrences = fingerprintOccurrences(rows);
  return rows.map((row, i) => ({ ...row, occurrence: occurrences[i] }));
}

export const SKIP_CURRENCY = "skip";

export type CurrencyMap = Readonly<Record<string, string>>;

const CURRENCY_CODE = /^[A-Z]{3}$/;

export function recognizedCurrency(row: SheetRow): string | null {
  return row.currency && isSupportedCurrency(row.currency)
    ? row.currency
    : null;
}

export function isUnsupportedCurrency(row: SheetRow): boolean {
  return Boolean(
    row.currency &&
      !isSupportedCurrency(row.currency) &&
      CURRENCY_CODE.test(row.currency),
  );
}

export function unknownCurrencyValues(rows: SheetRow[]): string[] {
  const values = rows.flatMap((row) =>
    row.currency && !recognizedCurrency(row) && !isUnsupportedCurrency(row)
      ? [row.currency]
      : [],
  );
  return [...new Set(values)];
}

export function rowCurrency(
  row: SheetRow,
  fallback: string,
  map: CurrencyMap,
): string | null {
  const recognized = recognizedCurrency(row);
  if (recognized) return recognized;
  if (row.currency === null) return fallback || null;
  const mapped = map[row.currency];
  return mapped && mapped !== SKIP_CURRENCY ? mapped : null;
}

export function isSkippedRow(row: SheetRow, map: CurrencyMap): boolean {
  return (
    isUnsupportedCurrency(row) ||
    Boolean(row.currency && map[row.currency] === SKIP_CURRENCY)
  );
}

export function skippedCurrencyIssues(
  rows: SheetRow[],
  map: CurrencyMap,
): SheetRowIssue[] {
  return rows
    .filter((row) => isSkippedRow(row, map))
    .map((row) => ({
      sheet: row.sheet,
      row: row.row,
      reason: `currency ${row.currency} is not supported`,
    }));
}

export function rowsWithoutCurrency(rows: SheetRow[]): number {
  return rows.filter((row) => row.currency === null).length;
}

export function toCsvRow(
  row: SheetRow,
  currency: string,
  externalId: string,
): CsvRow {
  return {
    kind: row.kind,
    amount: row.amount,
    currency,
    occurredOn: row.occurredOn,
    description: row.description.trim() || null,
    externalId,
  };
}

export function inChunks<T>(items: T[], size = SHEET_REQUEST_ROWS): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function signedAmount(row: SheetRow): number {
  return row.kind === "expense" ? -row.amount : row.amount;
}
