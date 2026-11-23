import type {
  DateSpec,
  SheetRecipe,
  TableRecipe,
} from "@/lib/sheetImport/recipe";
import {
  cellText,
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
  column: string;
  occurredOn: string;
  kind: "expense" | "income";
  amount: number;
  description: string;
  currency: string | null;
  fingerprintKey: string;
}

export interface SheetRowIssue {
  sheet: string;
  row: number;
  reason: string;
}

export interface AppliedRecipe {
  rows: SheetRow[];
  skipped: SheetRowIssue[];
  errors: SheetRowIssue[];
}

interface Money {
  column: string;
  kind: SheetRow["kind"];
  amount: number;
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
  if (amount?.mode === "split") {
    columns.push(amount.expenseColumn, amount.incomeColumn);
  }
  if (amount?.mode === "type_column") {
    columns.push(amount.column, amount.typeColumn);
  }
  return [...new Set(columns.filter((c): c is string => Boolean(c)))];
}

function withKind(column: string, value: number, kind: Money["kind"]): Money {
  return { column, kind, amount: Math.abs(value) };
}

function rowMoney(grid: SheetGrid, row: number, table: TableRecipe): Money[] {
  const amount = table.amount;
  if (!amount) throw new Error("rows layout without amount");
  const format = table.numberFormat;
  if (amount.mode === "signed") {
    const value = parseSheetAmount(grid.cell(amount.column, row), format);
    if (!value) return [];
    const isExpense = amount.expenseSign === "positive" ? value > 0 : value < 0;
    return [withKind(amount.column, value, isExpense ? "expense" : "income")];
  }
  if (amount.mode === "split") {
    const expense = parseSheetAmount(
      grid.cell(amount.expenseColumn, row),
      format,
    );
    const income = parseSheetAmount(
      grid.cell(amount.incomeColumn, row),
      format,
    );
    const money: Money[] = [];
    if (expense) {
      money.push(
        withKind(
          amount.expenseColumn,
          expense,
          expense > 0 ? "expense" : "income",
        ),
      );
    }
    if (income) {
      money.push(
        withKind(
          amount.incomeColumn,
          income,
          income > 0 ? "income" : "expense",
        ),
      );
    }
    return money;
  }
  const value = parseSheetAmount(grid.cell(amount.column, row), format);
  if (!value) return [];
  const type = fold(grid.cell(amount.typeColumn, row));
  const isIncome = amount.incomeValues.map(fold).includes(type)
    ? true
    : amount.expenseValues.map(fold).includes(type)
      ? false
      : amount.default === "income";
  return [withKind(amount.column, value, isIncome ? "income" : "expense")];
}

function describe(grid: SheetGrid, row: number, columns: string[]): string {
  return columns
    .map((c) => grid.cell(c, row))
    .filter((v) => v !== null && !isBlank(v))
    .map((v) => cellText(v as NonNullable<typeof v>))
    .join(" - ");
}

function blockText(grid: SheetGrid, row: number, column: string): string {
  const cells = grid.rowCells(row);
  const target = cells.findIndex((c) => c.column === column);
  if (target < 0) return "";
  let start = target;
  let end = target;
  while (start > 0 && cells[start - 1].index === cells[start].index - 1)
    start--;
  while (
    end < cells.length - 1 &&
    cells[end + 1].index === cells[end].index + 1
  )
    end++;
  return cells
    .slice(start, end + 1)
    .map((c) => (c.value === null ? (c.error ?? "") : fold(c.value)))
    .join("|");
}

function signedKey(occurredOn: string, money: Money): string {
  const signed = money.kind === "expense" ? -money.amount : money.amount;
  return `${occurredOn}|${signed}`;
}

function skipWordIn(
  grid: SheetGrid,
  row: number,
  columns: string[],
  table: TableRecipe,
): string | null {
  const words = table.skipIfContains.map(fold).filter(Boolean);
  const descriptions = new Set(table.descriptionColumns);
  for (const column of columns) {
    const text = fold(grid.cell(column, row));
    if (!text) continue;
    for (const word of words) {
      if (text === word) return word;
      const prefix = text.startsWith(`${word} `) || text.startsWith(`${word}:`);
      if (prefix && !descriptions.has(column)) return word;
    }
  }
  return null;
}

class TableReader {
  private readonly columns: string[];
  private readonly dateSpec: DateSpec;
  private lastSectionMonth: number | null = null;
  private carriedDate: string | null = null;

  constructor(
    private readonly grid: SheetGrid,
    private readonly table: TableRecipe,
    private readonly out: AppliedRecipe,
    private readonly claimed: Set<string>,
  ) {
    this.columns = tableColumns(table);
    this.dateSpec = { ...table.date };
  }

  private issue(row: number, reason: string): SheetRowIssue {
    return { sheet: this.grid.name, row, reason };
  }

  private claim(row: number, column: string): boolean {
    const key = `${this.grid.name}!${column}${row}`;
    if (this.claimed.has(key)) {
      this.out.errors.push(
        this.issue(row, `${column}${row} already read by another table`),
      );
      return false;
    }
    this.claimed.add(key);
    return true;
  }

  private sectionRow(row: number, report = true): boolean {
    if (this.dateSpec.kind !== "day_with_section_month") return false;
    const section = sectionMonth(this.grid.cell(this.dateSpec.column, row));
    if (!section) return false;
    if (section.year) {
      this.dateSpec.year = section.year;
    } else if (
      this.lastSectionMonth !== null &&
      section.month < this.lastSectionMonth &&
      this.dateSpec.year !== null
    ) {
      this.dateSpec.year += 1;
    }
    this.dateSpec.month = section.month;
    this.lastSectionMonth = section.month;
    if (report) this.out.skipped.push(this.issue(row, "month section"));
    return true;
  }

  private push(
    row: number,
    money: Money,
    occurredOn: string,
    description: string,
    key: string,
  ) {
    if (!this.claim(row, money.column)) return;
    const currency = this.table.currencyColumn
      ? this.grid.cell(this.table.currencyColumn, row)
      : null;
    this.out.rows.push({
      sheet: this.grid.name,
      row,
      column: money.column,
      occurredOn,
      kind: money.kind,
      amount: money.amount,
      description,
      currency:
        currency === null || isBlank(currency)
          ? null
          : cellText(currency).toUpperCase(),
      fingerprintKey: `${signedKey(occurredOn, money)}|${key}`,
    });
  }

  private listRow(row: number) {
    const money = rowMoney(this.grid, row, this.table);
    if (!money.length) {
      this.out.skipped.push(this.issue(row, "no amount"));
      return;
    }
    const description = describe(this.grid, row, this.table.descriptionColumns);
    const rawDate = this.grid.cell(this.dateSpec.column, row);
    let occurredOn: string;
    if (isBlank(rawDate)) {
      if (!this.carriedDate || !description) {
        this.out.errors.push(this.issue(row, "amount without a date"));
        return;
      }
      occurredOn = this.carriedDate;
    } else {
      occurredOn = parseSheetDate(rawDate, this.dateSpec);
      this.carriedDate = occurredOn;
    }
    for (const item of money) {
      this.push(
        row,
        item,
        occurredOn,
        description,
        blockText(this.grid, row, item.column),
      );
    }
  }

  private gridRow(row: number) {
    const spec = this.table.grid;
    if (!spec) throw new Error("grid layout without grid");
    const across = spec.orientation === "dates_across";
    const label =
      across && spec.categoryColumn
        ? cellText(this.grid.cell(spec.categoryColumn, row) ?? "")
        : "";
    let rowDate: string | null = null;
    let found = false;
    for (const column of spec.valueColumns) {
      try {
        const value = parseSheetAmount(
          this.grid.cell(column, row),
          this.table.numberFormat,
        );
        if (!value) continue;
        found = true;
        const header = this.grid.cell(column, spec.headerRow);
        if (!across && rowDate === null) {
          rowDate = parseSheetDate(
            this.grid.cell(this.dateSpec.column, row),
            this.dateSpec,
          );
        }
        const occurredOn = across
          ? parseSheetDate(header, this.dateSpec)
          : (rowDate as string);
        const description = across
          ? label
          : header === null
            ? ""
            : cellText(header);
        const money = withKind(column, value, spec.kind);
        this.push(row, money, occurredOn, description, fold(description));
      } catch (error) {
        found = true;
        this.out.errors.push(
          this.issue(row, `${column}${row}: ${messageOf(error)}`),
        );
        if (!across && rowDate === null) return;
      }
    }
    if (!found) this.out.skipped.push(this.issue(row, "no amount"));
  }

  read() {
    const last = this.table.lastDataRow ?? this.grid.rowCount;
    for (const row of this.grid.rows()) {
      if (row > last) continue;
      if (row < this.table.firstDataRow) {
        this.sectionRow(row, false);
        continue;
      }
      const used = this.columns.filter(
        (c) =>
          this.grid.cellError(c, row) !== null ||
          !isBlank(this.grid.cell(c, row)),
      );
      if (!used.length || this.sectionRow(row)) continue;
      if (used.length === 1 && used[0] === this.dateSpec.column) continue;
      const word = skipWordIn(this.grid, row, used, this.table);
      if (word) {
        this.out.skipped.push(this.issue(row, `contains "${word}"`));
        continue;
      }
      const broken = used.find((c) => this.grid.cellError(c, row) !== null);
      if (broken) {
        this.out.errors.push(
          this.issue(
            row,
            `${broken}${row}: ${this.grid.cellError(broken, row)}`,
          ),
        );
        continue;
      }
      try {
        if (this.table.layout === "grid") this.gridRow(row);
        else this.listRow(row);
      } catch (error) {
        this.out.errors.push(this.issue(row, messageOf(error)));
      }
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sheetKey(name: string): string {
  return name.normalize("NFC").trim().toLowerCase();
}

function findGrid(grids: SheetGrid[], name: string): SheetGrid | undefined {
  return (
    grids.find((g) => g.name === name) ??
    grids.find((g) => sheetKey(g.name) === sheetKey(name))
  );
}

export function applyRecipe(
  grids: SheetGrid[],
  recipe: SheetRecipe,
): AppliedRecipe {
  const out: AppliedRecipe = { rows: [], skipped: [], errors: [] };
  const claimed = new Set<string>();
  for (const table of recipe.tables) {
    if (!table.import) continue;
    const grid = findGrid(grids, table.sheet);
    if (!grid) {
      out.errors.push({ sheet: table.sheet, row: 0, reason: "unknown sheet" });
      continue;
    }
    new TableReader(grid, table, out, claimed).read();
  }
  return out;
}
