import type {
  DateSpec,
  NumberFormat,
  TableRecipe,
} from "@/lib/sheetImport/recipe";
import type { SheetRowIssue } from "@/lib/sheetImport/apply";
import type { ReadingChange, ReadingConflict } from "@/lib/sheetImport/layout";
import { NO_COLUMN } from "@/lib/constants/sheetImport";

export function withDecimal(
  format: NumberFormat,
  decimal: NumberFormat["decimal"],
): NumberFormat {
  const thousands =
    format.thousands === decimal
      ? decimal === ","
        ? "."
        : ","
      : format.thousands;
  return { decimal, thousands };
}

export function withDate(
  table: TableRecipe,
  patch: Partial<DateSpec>,
): Partial<TableRecipe> {
  return { date: { ...table.date, ...patch } };
}

export function withAmount(
  table: TableRecipe,
  patch: Record<string, string>,
): Partial<TableRecipe> {
  if (!table.amount) return {};
  return { amount: { ...table.amount, ...patch } as TableRecipe["amount"] };
}

export function withFirstRow(value: string): Partial<TableRecipe> | null {
  const row = Number(value);
  return Number.isInteger(row) && row > 0 ? { firstDataRow: row } : null;
}

export function withDescription(column: string): Partial<TableRecipe> {
  return { descriptionColumns: column === NO_COLUMN ? [] : [column] };
}

export function issueLabel(issue: SheetRowIssue): string {
  return issue.row > 0
    ? `${issue.sheet} row ${issue.row}: ${issue.reason}`
    : `${issue.sheet}: ${issue.reason}`;
}

const READING_CHANGE_LABELS: Record<ReadingChange, string> = {
  tab: "whether this tab is imported",
  layout: "the table layout",
  dates: "the dates",
  numbers: "the number format",
  amounts: "the amounts",
  description: "the description",
  currency: "the currency column",
  skipped: "which rows are skipped",
};

export function readingConflictText(conflict: ReadingConflict): string {
  const changes = conflict.changes.map((c) => READING_CHANGE_LABELS[c]);
  return `${conflict.fresh.sheet}: this reading differs from your last import of a file with these columns (${changes.join(", ")}). Pick which one to use.`;
}
