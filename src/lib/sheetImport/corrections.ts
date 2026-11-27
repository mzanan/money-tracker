import type {
  DateSpec,
  NumberFormat,
  TableRecipe,
} from "@/lib/sheetImport/recipe";
import type { SheetRowIssue } from "@/lib/sheetImport/apply";
import type { ReadingChange, ReadingConflict } from "@/lib/sheetImport/layout";
import { CURRENCY_CODES } from "@/lib/constants/currencies";
import { SKIP_CURRENCY } from "@/lib/sheetImport/review";
import type { SelectOption } from "@/types/select";

export const SHEET_FILE_ACCEPT =
  ".xlsx,.xlsm,.xlsb,.xls,.ods,.numbers,.csv,.tsv,.txt,text/csv";

export const MAX_LISTED_ISSUES = 50;

export const NO_COLUMN = "none";

export const DATE_ORDER_OPTIONS: SelectOption[] = [
  { value: "dmy", label: "Day / month / year" },
  { value: "mdy", label: "Month / day / year" },
  { value: "ymd", label: "Year / month / day" },
];

export const EXPENSE_SIGN_OPTIONS: SelectOption[] = [
  { value: "negative", label: "Negative (-50)" },
  { value: "positive", label: "Positive (50)" },
];

export const DECIMAL_OPTIONS: SelectOption[] = [
  { value: ",", label: "Comma (1.250,50)" },
  { value: ".", label: "Point (1,250.50)" },
];

export const CURRENCY_MAP_OPTIONS: SelectOption[] = [
  { value: SKIP_CURRENCY, label: "Not supported: skip these rows" },
  ...CURRENCY_CODES.map((code) => ({ value: code, label: code })),
];

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
