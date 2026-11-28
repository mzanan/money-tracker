import type { SheetRow } from "@/lib/sheetImport/apply";
import type { ImportRow } from "@/lib/sheetImport/importInput";
import { rowCurrency, type CurrencyMap } from "@/lib/sheetImport/currency";
import type { SheetRowCheck } from "@/lib/sheetImport/check";
import { skippedRowLog, type SheetRowLog } from "@/lib/sheetImport/log";
import { isRowSelected } from "@/lib/sheetImport/selection";

export function toCsvRow(
  row: SheetRow,
  currency: string,
  externalId: string,
): ImportRow["csv"] {
  return {
    kind: row.kind,
    amount: row.amount,
    currency,
    occurredOn: row.occurredOn,
    description: row.description.trim() || null,
    externalId,
  };
}

export function buildImportPlan(
  rows: ReadonlyArray<SheetRow>,
  checks: ReadonlyArray<SheetRowCheck>,
  toggled: ReadonlySet<number>,
  currency: string,
  map: CurrencyMap,
): { toImport: ImportRow[]; skippedLogs: SheetRowLog[] } {
  const toImport = rows.flatMap((row, index): ImportRow[] => {
    const check = checks[index];
    const resolved = rowCurrency(row, currency, map);
    if (!isRowSelected(index, check, toggled) || !resolved) return [];
    return [
      {
        sheet: row.sheet,
        row: row.row,
        csv: toCsvRow(row, resolved, check.externalId),
      },
    ];
  });
  const skippedLogs = rows.flatMap((row, index) =>
    checks[index] && !isRowSelected(index, checks[index], toggled)
      ? [skippedRowLog(row, checks[index])]
      : [],
  );
  return { toImport, skippedLogs };
}

export function importSuccessText(imported: number, skipped: number): string {
  return (
    `Imported ${imported}` +
    (skipped > 0 ? `, ${skipped} already in your records` : "")
  );
}

export function partialImportText(error: string, imported: number): string {
  return imported > 0 ? `${error} (${imported} already imported)` : error;
}
