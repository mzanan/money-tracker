import { CURRENCY_CODES } from "@/lib/constants/currencies";
import type { SelectOption } from "@/types/select";

export const SHEET_ROW_STATUSES = [
  "imported",
  "already_imported",
  "duplicate",
  "excluded",
  "not_read",
] as const;

export type SheetRowStatus = (typeof SHEET_ROW_STATUSES)[number];

export const DUPLICATE_STEPS = [
  "external_id",
  "legacy_hash",
  "reread",
  "description",
  "ai",
] as const;

export type DuplicateStep = (typeof DUPLICATE_STEPS)[number];

export const SKIP_CURRENCY = "skip";

export const SHEET_REQUEST_ROWS = 500;

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
