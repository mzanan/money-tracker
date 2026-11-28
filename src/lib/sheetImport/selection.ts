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

export function duplicateIndexes(
  checks: ReadonlyArray<SheetRowCheck> | null,
): number[] {
  if (!checks) return [];
  return checks.flatMap((check, index) =>
    check.state === "duplicate" ? [index] : [],
  );
}

export function allRowsSelected(
  indexes: readonly number[],
  checks: ReadonlyArray<SheetRowCheck> | null,
  toggled: ReadonlySet<number>,
): boolean {
  return (
    indexes.length > 0 &&
    indexes.every((index) => isRowSelected(index, checks?.[index], toggled))
  );
}

export function withIndexes(
  toggled: ReadonlySet<number>,
  indexes: readonly number[],
  on: boolean,
): ReadonlySet<number> {
  const next = new Set(toggled);
  for (const index of indexes) {
    if (on) next.add(index);
    else next.delete(index);
  }
  return next;
}

export function duplicatesToggleLabel(
  count: number,
  allTicked: boolean,
): string {
  if (allTicked) {
    return count === 1
      ? "Untick the possible duplicate"
      : "Untick all possible duplicates";
  }
  return count === 1
    ? "Tick the possible duplicate"
    : `Tick all ${count} possible duplicates`;
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
