import type { SheetRow } from "@/lib/sheetImport/apply";
import type { CurrencyMap } from "@/lib/sheetImport/currency";
import {
  readingsChosen,
  type ReadingChoice,
  type ReadingConflict,
} from "@/lib/sheetImport/layout";
import type { SheetRowCheck } from "@/lib/sheetImport/check";

export function isRowLocked(check: SheetRowCheck | undefined): boolean {
  return check?.state === "already_imported";
}

export function isRowSelected(
  index: number,
  check: SheetRowCheck | undefined,
  toggled: ReadonlySet<number>,
): boolean {
  if (!check || isRowLocked(check)) return false;
  const byDefault = check.state === "new";
  return toggled.has(index) ? !byDefault : byDefault;
}

export function selectedRowCount(
  rows: ReadonlyArray<SheetRow>,
  checks: ReadonlyArray<SheetRowCheck> | null,
  toggled: ReadonlySet<number>,
): number {
  if (!checks) return 0;
  return rows.filter((_, index) => isRowSelected(index, checks[index], toggled))
    .length;
}

export function needsCurrency(
  missingCurrency: number,
  unknownCurrencies: ReadonlyArray<string>,
  currency: string,
  map: CurrencyMap,
): boolean {
  return (
    (missingCurrency > 0 && !currency) ||
    unknownCurrencies.some((raw) => !map[raw])
  );
}

export function canSubmitImport(input: {
  source: string;
  checks: ReadonlyArray<SheetRowCheck> | null;
  selectedCount: number;
  needsCurrency: boolean;
  conflicts: readonly ReadingConflict[];
  choices: Readonly<Record<number, ReadingChoice>>;
}): boolean {
  return Boolean(
    input.source.trim() &&
    input.checks &&
    input.selectedCount > 0 &&
    !input.needsCurrency &&
    readingsChosen(input.conflicts, input.choices),
  );
}
