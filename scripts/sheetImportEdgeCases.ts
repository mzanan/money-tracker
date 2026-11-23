import * as XLSX from "xlsx";

import { applyRecipe } from "@/lib/sheetImport/apply";
import { encodeWorkbook } from "@/lib/sheetImport/encode";
import { sheetFingerprints } from "@/lib/sheetImport/fingerprint";
import {
  parseSheetAmount,
  parseSheetDate,
  sectionMonth,
} from "@/lib/sheetImport/parse";
import { SheetRecipeSchema, type TableRecipe } from "@/lib/sheetImport/recipe";
import { readWorkbook, SheetFileError } from "@/lib/sheetImport/workbook";

type Row = (string | number | null)[];

const BASE: TableRecipe = {
  sheet: "S",
  import: true,
  layout: "rows",
  firstDataRow: 2,
  lastDataRow: null,
  skipIfContains: [],
  date: { column: "A", kind: "full", order: "dmy", year: 2024, month: null },
  numberFormat: { decimal: ",", thousands: "." },
  amount: { mode: "signed", column: "C", expenseSign: "positive" },
  descriptionColumns: ["B"],
  currencyColumn: null,
  grid: null,
};

function bytesOf(sheet: XLSX.WorkSheet, name = "S"): Uint8Array {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, name);
  return new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx" }));
}

function sheetOf(rows: Row[]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows);
}

function run(
  sheet: XLSX.WorkSheet,
  table: Partial<TableRecipe> = {},
  name = "S",
) {
  return applyRecipe(readWorkbook(bytesOf(sheet, name)), {
    tables: [{ ...BASE, ...table }],
  });
}

function attempt<T>(fn: () => T): T | string {
  try {
    return fn();
  } catch (error) {
    return error instanceof Error ? `error: ${error.message}` : "error";
  }
}

const checks: [string, () => boolean][] = [
  [
    "1 stray far cell encodes fast",
    () => {
      const sheet = sheetOf([
        ["Fecha", "Desc", "Monto"],
        ["01/03/2024", "a", 10],
      ]);
      sheet["XFD5000"] = { t: "s", v: "x" };
      sheet["!ref"] = "A1:XFD5000";
      const bytes = bytesOf(sheet);
      const started = Date.now();
      encodeWorkbook(readWorkbook(bytes));
      return Date.now() - started < 2000;
    },
  ],
  [
    "2 error cell is not imported",
    () => {
      const sheet = sheetOf([
        ["Fecha", "Desc", "Monto"],
        ["01/03/2024", "a", 10],
        ["02/03/2024", "b", 1],
      ]);
      sheet["C3"] = { t: "e", v: 0x2a, w: "#N/A" };
      const result = run(sheet);
      return result.rows.length === 1 && result.errors.length === 1;
    },
  ],
  [
    "3 blank date carries down, orphan amount is reported",
    () => {
      const carried = run(
        sheetOf([
          ["Fecha", "Desc", "Monto"],
          ["15/03/2024", "a", 10],
          [null, "b", 20],
          [null, "c", 30],
        ]),
      );
      const orphan = run(
        sheetOf([
          ["Fecha", "Desc", "Monto"],
          [null, "a", 10],
        ]),
      );
      return (
        carried.rows.length === 3 &&
        carried.rows.every((r) => r.occurredOn === "2024-03-15") &&
        orphan.errors.length === 1
      );
    },
  ],
  [
    "4 UTF-8 CSV keeps accents",
    () => {
      const grids = readWorkbook(
        new TextEncoder().encode(
          "Fecha,Desc,Monto\n01/03/2024,Café Señor,10\n",
        ),
      );
      return grids[0].cell("B", 2) === "Café Señor";
    },
  ],
  [
    "5 ids ignore the description choice and tables listed twice",
    () => {
      const sheet = sheetOf([
        ["Fecha", "Desc", "Nota", "Monto"],
        ["01/03/2024", "Super", "x", 10],
      ]);
      const amount = {
        mode: "signed" as const,
        column: "D",
        expenseSign: "positive" as const,
      };
      const one = run(sheet, { amount, descriptionColumns: ["B"] }).rows;
      const two = run(sheet, { amount, descriptionColumns: ["B", "C"] }).rows;
      const twice = applyRecipe(readWorkbook(bytesOf(sheet)), {
        tables: [
          { ...BASE, amount },
          { ...BASE, amount },
        ],
      });
      return (
        sheetFingerprints(one)[0] === sheetFingerprints(two)[0] &&
        twice.rows.length === 1 &&
        twice.errors.length === 1
      );
    },
  ],
  [
    "6 minus after a symbol stays negative",
    () => {
      const format = { decimal: ",", thousands: "." } as const;
      return ["$-50", "€ -50", "−50", "$(50)"].every(
        (v) => parseSheetAmount(v, format) === -50,
      );
    },
  ],
  [
    "7 split refund becomes income, both columns give two rows",
    () => {
      const result = run(
        sheetOf([
          ["Fecha", "Desc", "Gasto", "Ingreso"],
          ["01/03/2024", "refund", -30, null],
          ["02/03/2024", "both", 10, 500],
        ]),
        {
          amount: { mode: "split", expenseColumn: "C", incomeColumn: "D" },
        },
      );
      const kinds = result.rows.map((r) => `${r.kind}:${r.amount}`).join(",");
      return kinds === "income:30,expense:10,income:500";
    },
  ],
  [
    "8 same separators are rejected",
    () => {
      const table = { ...BASE, numberFormat: { decimal: ".", thousands: "." } };
      return !SheetRecipeSchema.safeParse({ tables: [table] }).success;
    },
  ],
  [
    "9 skip words match whole cells only",
    () => {
      const result = run(
        sheetOf([
          ["Fecha", "Desc", "Monto"],
          ["01/03/2024", "Totalplay", 10],
          ["02/03/2024", "Total", 99],
        ]),
        { skipIfContains: ["total"] },
      );
      return (
        result.rows.length === 1 && result.rows[0].description === "Totalplay"
      );
    },
  ],
  [
    "10 understated dimension keeps every cell",
    () => {
      const sheet = sheetOf([
        ["Fecha", "Desc", "Monto"],
        ["01/03/2024", "a", 10],
        ["02/03/2024", "b", 20],
      ]);
      const zip = XLSX.CFB.read(bytesOf(sheet), { type: "array" });
      const path = "/xl/worksheets/sheet1.xml";
      const entry = XLSX.CFB.find(zip, path);
      if (!entry?.content) return false;
      const xml = new TextDecoder()
        .decode(entry.content as Uint8Array)
        .replace(/<dimension ref="[^"]+"\/>/, '<dimension ref="A1:B2"/>');
      XLSX.CFB.utils.cfb_del(zip, path);
      XLSX.CFB.utils.cfb_add(zip, path, new TextEncoder().encode(xml));
      const patched = new Uint8Array(
        XLSX.CFB.write(zip, {
          type: "array",
          fileType: "zip",
        }) as ArrayLike<number>,
      );
      const result = applyRecipe(readWorkbook(patched), { tables: [BASE] });
      return xml.includes('ref="A1:B2"') && result.rows.length === 2;
    },
  ],
  [
    "11 impossible dates are rejected",
    () => {
      const spec = BASE.date;
      return [20240315, 15].every((v) =>
        String(attempt(() => parseSheetDate(v, spec))).startsWith("error"),
      );
    },
  ],
  [
    "12 month sections roll the year over",
    () => {
      const result = run(
        sheetOf([
          ["Día", "Desc", "Monto"],
          ["DICIEMBRE", null, null],
          [30, "a", 10],
          ["ENERO", null, null],
          [2, "Rent", 20],
        ]),
        {
          date: {
            column: "A",
            kind: "day_with_section_month",
            order: "dmy",
            year: 2023,
            month: null,
          },
        },
      );
      return (
        result.rows.map((r) => r.occurredOn).join(",") ===
        "2023-12-30,2024-01-02"
      );
    },
  ],
  [
    "13 formula without a saved value is reported",
    () => {
      const sheet = sheetOf([
        ["Fecha", "Desc", "Monto"],
        ["01/03/2024", "a", null],
      ]);
      sheet["C2"] = { t: "n", f: "1+1" } as XLSX.CellObject;
      const result = run(sheet);
      return result.rows.length === 0 && result.errors.length === 1;
    },
  ],
  [
    "14 two digit years use a pivot",
    () =>
      parseSheetDate("31/12/99", BASE.date) === "1999-12-31" &&
      parseSheetDate("01/02/24", BASE.date) === "2024-02-01",
  ],
  [
    "15 junk text is not an amount",
    () => {
      const format = { decimal: ",", thousands: "." } as const;
      return ["15%", "1.5E+03", "12abc34", "15/03/2024"].every((v) =>
        String(attempt(() => parseSheetAmount(v, format))).startsWith("error"),
      );
    },
  ],
  [
    "16 date used as description is ISO",
    () => {
      const sheet = sheetOf([
        ["Fecha", "Desc", "Monto"],
        ["01/03/2024", null, 10],
      ]);
      sheet["B2"] = { t: "d", v: new Date(Date.UTC(2024, 2, 1)) };
      return run(sheet).rows[0]?.description === "2024-03-01";
    },
  ],
  [
    "17 one bad header keeps the other cells",
    () => {
      const result = run(
        sheetOf([
          ["Concepto", "Ene", "Feb", "Total"],
          ["Luz", 10, 20, 30],
        ]),
        {
          layout: "grid",
          date: {
            column: "A",
            kind: "month",
            order: "dmy",
            year: 2026,
            month: null,
          },
          amount: null,
          descriptionColumns: [],
          grid: {
            orientation: "dates_across",
            headerRow: 1,
            categoryColumn: "A",
            valueColumns: ["B", "C", "D"],
            kind: "expense",
          },
        },
      );
      return result.rows.length === 2 && result.errors.length === 1;
    },
  ],
  [
    "18 non spreadsheet files are refused",
    () => {
      const pdf = new TextEncoder().encode("%PDF-1.7 fake");
      return [pdf, new Uint8Array()].every((bytes) => {
        try {
          readWorkbook(bytes);
          return false;
        } catch (error) {
          return error instanceof SheetFileError;
        }
      });
    },
  ],
  [
    "19 sheet names match after trimming",
    () =>
      run(
        sheetOf([
          ["Fecha", "Desc", "Monto"],
          ["01/03/2024", "a", 10],
        ]),
        { sheet: "Enero" },
        "Enero ",
      ).rows.length === 1,
  ],
  [
    "20 weekday and words are not months",
    () =>
      sectionMonth("Martes") === null &&
      sectionMonth("Marketing") === null &&
      sectionMonth("Mar") !== null,
  ],
];

let failures = 0;
for (const [name, check] of checks) {
  const passed = attempt(check) === true;
  if (!passed) failures++;
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}
console.log(failures ? `${failures} failing` : "all passing");
process.exitCode = failures ? 1 : 0;
