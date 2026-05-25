export type DateFormat = "iso" | "dmy" | "mdy";

export type SignConvention =
  | "signed-amount"
  | "debit-credit-cols"
  | "direction-column"
  | "all-expense"
  | "all-income";

export interface CsvMapping {
  dateCol: string;
  dateFormat: DateFormat;
  amountCol: string;
  currencyMode: "column" | "fixed";
  currencyCol: string;
  currencyFixed: string;
  descriptionCol: string;
  signConvention: SignConvention;
  debitCol: string;
  creditCol: string;
  directionCol: string;
  statusCol: string;
  sinceDate: string;
}

export interface CsvPreset {
  id: string;
  label: string;
  source: string;
  mapping: Partial<CsvMapping>;
}

export const CSV_PRESETS: CsvPreset[] = [
  {
    id: "wise",
    label: "Wise",
    source: "wise",
    mapping: {
      dateCol: "Created on",
      dateFormat: "iso",
      amountCol: "Source amount (after fees)",
      currencyMode: "column",
      currencyCol: "Source currency",
      descriptionCol: "Target name",
      signConvention: "direction-column",
      directionCol: "Direction",
      statusCol: "Status",
    },
  },
  {
    id: "astropay",
    label: "Astropay",
    source: "astropay",
    mapping: {},
  },
];

export const CSV_PRESET_BY_ID: Record<string, CsvPreset> = Object.fromEntries(
  CSV_PRESETS.map((preset) => [preset.id, preset]),
);
