import type { CsvRow } from "@/lib/actions/csvImport";
import type {
  DuplicateStep,
  SheetRowStatus,
} from "@/lib/constants/sheetImport";
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

export function checkRowOf(row: ReviewRow, fallback: string, map: CurrencyMap) {
  return {
    occurredOn: row.occurredOn,
    kind: row.kind,
    amount: row.amount,
    currency: rowCurrency(row, fallback, map),
    description: row.description,
    fingerprintKey: row.fingerprintKey,
    occurrence: row.occurrence,
  };
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

export interface RowCheckState {
  state: "new" | "already_imported" | "duplicate";
  step: DuplicateStep | null;
  externalId: string;
  match: { id: string } | null;
}

export function isRowLocked(check: RowCheckState | undefined): boolean {
  return check?.state === "already_imported";
}

export function isRowSelected(
  index: number,
  check: RowCheckState | undefined,
  toggled: ReadonlySet<number>,
): boolean {
  if (!check || isRowLocked(check)) return false;
  const byDefault = check.state === "new";
  return toggled.has(index) ? !byDefault : byDefault;
}

export function skippedRowLog(
  row: SheetRow,
  check: RowCheckState,
): SheetRowLogInput {
  return {
    sheet: row.sheet,
    row: row.row,
    status: check.state === "new" ? "excluded" : check.state,
    step: check.step,
    reason: null,
    externalId: null,
    matchedTransactionId: check.match?.id ?? null,
  };
}

export function notReadLog(issue: SheetRowIssue): SheetRowLogInput {
  return {
    sheet: issue.sheet,
    row: issue.row,
    status: "not_read",
    step: null,
    reason: issue.reason,
    externalId: null,
    matchedTransactionId: null,
  };
}

export function sourceFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase();
}

export interface SheetRowLogInput {
  sheet: string;
  row: number;
  status: SheetRowStatus;
  step: DuplicateStep | null;
  reason: string | null;
  externalId: string | null;
  matchedTransactionId: string | null;
}

export function duplicateLabel(match: {
  source: string;
  occurredOn: string;
  note: string | null;
}): string {
  return [match.source, match.occurredOn, match.note]
    .filter(Boolean)
    .join(" · ");
}
