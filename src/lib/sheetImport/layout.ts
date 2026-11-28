import { z } from "zod";

import { applyRecipe } from "@/lib/sheetImport/apply";
import { fold } from "@/lib/sheetImport/parse";
import {
  DateSpecSchema,
  GridSchema,
  TableRecipeSchema,
  type SheetRecipe,
  type TableRecipe,
} from "@/lib/sheetImport/recipe";
import type { SheetGrid } from "@/lib/sheetImport/workbook";

const MIN_HEADER_CELLS = 2;

export const ConventionsSchema = TableRecipeSchema.omit({
  sheet: true,
  import: true,
  firstDataRow: true,
  lastDataRow: true,
}).extend({
  date: DateSpecSchema.omit({ year: true, month: true }),
  grid: GridSchema.omit({ headerRow: true }).nullable(),
});

export type Conventions = z.infer<typeof ConventionsSchema>;

export interface SavedLayout {
  key: string;
  conventions: Conventions;
  lastSource: string;
}

export function layoutSignature(grid: SheetGrid): string | null {
  for (const row of grid.rows()) {
    const labels = grid
      .rowCells(row)
      .filter((cell) => typeof cell.value === "string" && fold(cell.value));
    if (labels.length >= MIN_HEADER_CELLS) {
      return labels
        .map((cell) => `${cell.column}=${fold(cell.value)}`)
        .join("|");
    }
  }
  return null;
}

export function tableLayoutKeys(
  recipe: SheetRecipe,
  grids: SheetGrid[],
): (string | null)[] {
  const signatures = new Map(grids.map((g) => [g.name, layoutSignature(g)]));
  const seen = new Map<string, number>();
  return recipe.tables.map((table) => {
    const signature = signatures.get(table.sheet);
    if (!signature) return null;
    const position = seen.get(table.sheet) ?? 0;
    seen.set(table.sheet, position + 1);
    return `${signature}#${position}`;
  });
}

export function conventionsOf(table: TableRecipe): Conventions {
  return ConventionsSchema.parse(table);
}

export function withConventions(
  table: TableRecipe,
  conventions: Conventions,
): TableRecipe {
  return {
    ...table,
    ...conventions,
    import: true,
    date: { ...table.date, ...conventions.date },
    grid: conventions.grid
      ? {
          ...conventions.grid,
          headerRow:
            table.grid?.headerRow ?? Math.max(table.firstDataRow - 1, 1),
        }
      : null,
  };
}

export const READING_CHANGES = [
  "tab",
  "layout",
  "dates",
  "numbers",
  "amounts",
  "description",
  "currency",
  "skipped",
] as const;

export type ReadingChange = (typeof READING_CHANGES)[number];

export interface ReadingConflict {
  table: number;
  fresh: TableRecipe;
  saved: TableRecipe;
  changes: ReadingChange[];
}

export interface ReconciledRecipe {
  recipe: SheetRecipe;
  conflicts: ReadingConflict[];
  matchedKeys: string[];
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${stable((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function sameValue(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function dateReading(table: TableRecipe) {
  const { column, kind, order, fillDown, sectionOrder } = table.date;
  return { column, kind, order, fillDown, sectionOrder };
}

function gridReading(table: TableRecipe) {
  if (!table.grid) return null;
  const { orientation, categoryColumn, valueColumns, kind } = table.grid;
  return { orientation, categoryColumn, valueColumns, kind };
}

export function readingChanges(
  fresh: TableRecipe,
  saved: TableRecipe,
): ReadingChange[] {
  const checks: Record<ReadingChange, boolean> = {
    tab: fresh.import !== saved.import,
    layout:
      fresh.layout !== saved.layout ||
      !sameValue(gridReading(fresh), gridReading(saved)),
    dates: !sameValue(dateReading(fresh), dateReading(saved)),
    numbers: !sameValue(fresh.numberFormat, saved.numberFormat),
    amounts: !sameValue(fresh.amount, saved.amount),
    description: !sameValue(
      [...fresh.descriptionColumns].sort(),
      [...saved.descriptionColumns].sort(),
    ),
    currency: fresh.currencyColumn !== saved.currencyColumn,
    skipped: !sameValue(
      [...fresh.skipIfContains].sort(),
      [...saved.skipIfContains].sort(),
    ),
  };
  return READING_CHANGES.filter((change) => checks[change]);
}

function readingOutcome(grids: SheetGrid[], table: TableRecipe): string {
  const applied = applyRecipe(grids, { tables: [table] });
  return stable({
    rows: applied.rows.map((row) => [
      row.sheet,
      row.row,
      row.fingerprintKey,
      row.currency,
    ]),
    errors: applied.errors.map((issue) => [issue.sheet, issue.row]),
  });
}

export function reconcileRecipe(
  recipe: SheetRecipe,
  keys: (string | null)[],
  saved: ReadonlyMap<string, Conventions>,
  grids: SheetGrid[],
): ReconciledRecipe {
  const conflicts: ReadingConflict[] = [];
  const matchedKeys: string[] = [];
  const tables = recipe.tables.map((table, i) => {
    const key = keys[i];
    const conventions = key ? saved.get(key) : undefined;
    if (!key || !conventions) return table;
    const pinned = withConventions(table, conventions);
    if (readingOutcome(grids, table) === readingOutcome(grids, pinned)) {
      if (table.import) matchedKeys.push(key);
      return { ...pinned, import: table.import };
    }
    const changes = readingChanges(table, pinned);
    conflicts.push({ table: i, fresh: table, saved: pinned, changes });
    return table;
  });
  return { recipe: { tables }, conflicts, matchedKeys };
}

export type ReadingChoice = "fresh" | "saved";

export function readingsChosen(
  conflicts: readonly ReadingConflict[],
  choices: Readonly<Record<number, ReadingChoice>>,
): boolean {
  return conflicts.every((conflict) => choices[conflict.table] !== undefined);
}

export function layoutSource(
  layouts: ReadonlyArray<{ signature: string; lastSource: string }>,
  matchedKeys: readonly string[],
): string | null {
  return (
    layouts.find((layout) => matchedKeys.includes(layout.signature))
      ?.lastSource ?? null
  );
}

export function withTable(
  recipe: SheetRecipe,
  index: number,
  table: TableRecipe,
): SheetRecipe {
  return {
    tables: recipe.tables.map((current, i) => (i === index ? table : current)),
  };
}

export function withReading(
  recipe: SheetRecipe,
  conflict: ReadingConflict,
  choice: ReadingChoice,
): SheetRecipe {
  return withTable(
    recipe,
    conflict.table,
    choice === "saved" ? conflict.saved : conflict.fresh,
  );
}

export function patchTable(
  recipe: SheetRecipe,
  index: number,
  patch: Partial<TableRecipe>,
): SheetRecipe {
  return withTable(recipe, index, { ...recipe.tables[index], ...patch });
}

export function layoutsToSave(
  recipe: SheetRecipe,
  keys: (string | null)[],
): Array<{ signature: string; conventions: Conventions }> {
  return recipe.tables.flatMap((table, i) =>
    table.import && keys[i]
      ? [{ signature: keys[i]!, conventions: conventionsOf(table) }]
      : [],
  );
}

export function uniqueSignatures(keys: ReadonlyArray<string | null>): string[] {
  return [...new Set(keys.filter((key): key is string => !!key))];
}

export function conventionsBySignature(
  layouts: ReadonlyArray<{ signature: string; conventions: Conventions }>,
): Map<string, Conventions> {
  return new Map(layouts.map((l) => [l.signature, l.conventions]));
}
