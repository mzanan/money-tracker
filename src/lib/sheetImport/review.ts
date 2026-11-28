import type { SheetRow } from "@/lib/sheetImport/apply";
import type { CheckRow } from "@/lib/sheetImport/check";
import { rowCurrency, type CurrencyMap } from "@/lib/sheetImport/currency";
import { fingerprintOccurrences } from "@/lib/sheetImport/occurrence";

export interface ReviewRow extends SheetRow {
  occurrence: number;
}

export function reviewRows(rows: SheetRow[]): ReviewRow[] {
  const occurrences = fingerprintOccurrences(rows);
  return rows.map((row, i) => ({ ...row, occurrence: occurrences[i] }));
}

export function checkRowOf(
  row: ReviewRow,
  fallback: string,
  map: CurrencyMap,
): CheckRow {
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

export function signedAmount(row: SheetRow): number {
  return row.kind === "expense" ? -row.amount : row.amount;
}

export function sourceFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase();
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
