import type {
  DateSpec,
  NumberFormat,
  TableRecipe,
  SheetRecipe,
} from "@/lib/sheetImport/recipe";
import {
  fold,
  isBlank,
  parseSheetAmount,
  parseSheetDate,
  sectionMonth,
} from "@/lib/sheetImport/parse";
import type { SheetGrid } from "@/lib/sheetImport/workbook";

export interface SheetRow {
  sheet: string;
  row: number;
  occurredOn: string;
  kind: "expense" | "income";
  amount: number;
  description: string;
  currency: string | null;
}

export interface SheetRowError {
  sheet: string;
  row: number;
  message: string;
}

export interface AppliedRecipe {
  rows: SheetRow[];
  errors: SheetRowError[];
}

function tableColumns(table: TableRecipe): string[] {
  const amount = table.amount;
  const columns = [
    table.date.column,
    table.currencyColumn,
    table.grid?.categoryColumn,
    ...table.descriptionColumns,
    ...(table.grid?.valueColumns ?? []),
  ];
  if (amount?.mode === "signed") columns.push(amount.column);
  if (amount?.mode === "split")
    columns.push(amount.expenseColumn, amount.incomeColumn);
  if (amount?.mode === "type_column")
    columns.push(amount.column, amount.typeColumn);
  return [...new Set(columns.filter((c): c is string => Boolean(c)))];
}

function signed(
  value: number,
  kind: "expense" | "income",
): Pick<SheetRow, "kind" | "amount"> {
  return { kind, amount: Math.abs(value) };
}

function listRow(
  grid: SheetGrid,
  row: number,
  table: TableRecipe,
  occurredOn: string,
): SheetRow | null {
  const amount = table.amount;
  if (!amount) throw new Error("rows layout without amount");
  const format = table.numberFormat;
  let money: Pick<SheetRow, "kind" | "amount"> | null = null;
  if (amount.mode === "signed") {
    const value = parseSheetAmount(grid.cell(amount.column, row), format);
    if (!value) return null;
    const isExpense = amount.expenseSign === "positive" ? value > 0 : value < 0;
    money = signed(value, isExpense ? "expense" : "income");
  } else if (amount.mode === "split") {
    const expense = parseSheetAmount(
      grid.cell(amount.expenseColumn, row),
      format,
    );
    const income = parseSheetAmount(
      grid.cell(amount.incomeColumn, row),
      format,
    );
    if (expense) money = signed(expense, "expense");
    else if (income) money = signed(income, "income");
  } else {
    const value = parseSheetAmount(grid.cell(amount.column, row), format);
    if (!value) return null;
    const type = fold(grid.cell(amount.typeColumn, row));
    const isIncome = amount.incomeValues.map(fold).includes(type)
      ? true
      : amount.expenseValues.map(fold).includes(type)
        ? false
        : amount.default === "income";
    money = signed(value, isIncome ? "income" : "expense");
  }
  if (!money) return null;
  const description = table.descriptionColumns
    .map((c) => grid.cell(c, row))
    .filter((v) => v !== null && !isBlank(v))
    .map((v) => String(v).trim())
    .join(" - ");
  const currency = table.currencyColumn
    ? grid.cell(table.currencyColumn, row)
    : null;
  return {
    sheet: grid.name,
    row,
    occurredOn,
    ...money,
    description,
    currency:
      currency === null || isBlank(currency)
        ? null
        : String(currency).trim().toUpperCase(),
  };
}

function gridCells(
  grid: SheetGrid,
  row: number,
  table: TableRecipe,
  dateSpec: DateSpec,
  format: NumberFormat,
): SheetRow[] {
  const spec = table.grid;
  if (!spec) throw new Error("grid layout without grid");
  const across = spec.orientation === "dates_across";
  const rowDate = across
    ? null
    : parseSheetDate(grid.cell(dateSpec.column, row), dateSpec);
  const rowLabel =
    across && spec.categoryColumn
      ? String(grid.cell(spec.categoryColumn, row) ?? "").trim()
      : "";
  return spec.valueColumns.flatMap((column) => {
    const value = parseSheetAmount(grid.cell(column, row), format);
    if (!value) return [];
    const header = grid.cell(column, spec.headerRow);
    return [
      {
        sheet: grid.name,
        row,
        occurredOn: rowDate ?? parseSheetDate(header, dateSpec),
        ...signed(value, spec.kind),
        description: across ? rowLabel : String(header ?? "").trim(),
        currency: null,
      },
    ];
  });
}

function applyTable(grid: SheetGrid, table: TableRecipe, out: AppliedRecipe) {
  const last = Math.min(table.lastDataRow ?? grid.rowCount, grid.rowCount);
  const skips = table.skipIfContains.map(fold).filter(Boolean);
  const columns = tableColumns(table);
  const dateSpec: DateSpec = { ...table.date };
  const across =
    table.layout === "grid" && table.grid?.orientation === "dates_across";
  for (let row = table.firstDataRow; row <= last; row++) {
    if (dateSpec.kind === "day_with_section_month") {
      const section = sectionMonth(grid.cell(dateSpec.column, row));
      if (section) {
        dateSpec.month = section.month;
        if (section.year) dateSpec.year = section.year;
        continue;
      }
    }
    const text = columns
      .map((c) => fold(grid.cell(c, row)))
      .filter(Boolean)
      .join(" ");
    if (!text || skips.some((s) => text.includes(s))) continue;
    try {
      if (across) {
        out.rows.push(
          ...gridCells(grid, row, table, dateSpec, table.numberFormat),
        );
        continue;
      }
      const rawDate = grid.cell(dateSpec.column, row);
      if (isBlank(rawDate)) continue;
      if (table.layout === "grid") {
        out.rows.push(
          ...gridCells(grid, row, table, dateSpec, table.numberFormat),
        );
        continue;
      }
      const parsed = listRow(
        grid,
        row,
        table,
        parseSheetDate(rawDate, dateSpec),
      );
      if (parsed) out.rows.push(parsed);
    } catch (error) {
      out.errors.push({
        sheet: grid.name,
        row,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function applyRecipe(
  grids: SheetGrid[],
  recipe: SheetRecipe,
): AppliedRecipe {
  const out: AppliedRecipe = { rows: [], errors: [] };
  const byName = new Map(grids.map((g) => [g.name, g]));
  for (const table of recipe.tables) {
    if (!table.import) continue;
    const grid = byName.get(table.sheet);
    if (!grid) {
      out.errors.push({ sheet: table.sheet, row: 0, message: "unknown sheet" });
      continue;
    }
    applyTable(grid, table, out);
  }
  return out;
}
