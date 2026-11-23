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
import {
  MAX_FILE_BYTES,
  readWorkbook,
  SheetFileError,
} from "@/lib/sheetImport/workbook";

type Row = (string | number | null)[];

const BASE: TableRecipe = {
  sheet: "S",
  import: true,
  layout: "rows",
  firstDataRow: 2,
  lastDataRow: null,
  skipIfContains: [],
  date: {
    column: "A",
    kind: "full",
    order: "dmy",
    year: 2024,
    month: null,
    fillDown: false,
    sectionOrder: null,
  },
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
  return applyRecipe(readWorkbook(bytesOf(sheet, name)).sheets, {
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
      encodeWorkbook(readWorkbook(bytes).sheets);
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
    "3 blank date carries down when the recipe says so, orphan amount is reported",
    () => {
      const carried = run(
        sheetOf([
          ["Fecha", "Desc", "Monto"],
          ["15/03/2024", "a", 10],
          [null, "b", 20],
          [null, "c", 30],
        ]),
        { date: { ...BASE.date, fillDown: true } },
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
        carried.rows.filter((r) => r.dateCarried).length === 2 &&
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
      return grids.sheets[0].cell("B", 2) === "Café Señor";
    },
  ],
  [
    "5 a table listed twice is reported",
    () => {
      const sheet = sheetOf([
        ["Fecha", "Desc", "Monto"],
        ["01/03/2024", "Super", 10],
      ]);
      const twice = applyRecipe(readWorkbook(bytesOf(sheet)).sheets, {
        tables: [BASE, BASE],
      });
      return twice.rows.length === 1 && twice.errors.length === 1;
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
      const result = applyRecipe(readWorkbook(patched).sheets, {
        tables: [BASE],
      });
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
            fillDown: false,
            sectionOrder: "ascending",
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
            fillDown: false,
            sectionOrder: null,
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
  [
    "21 blank date rows are reported unless the recipe fills down, totals are skipped",
    () => {
      const rows: Row[] = [
        ["Fecha", "Desc", "Monto"],
        ["01/03/2024", "pan", 100],
        [null, "leche", 50],
        [null, "Totalplay", 20],
        [null, "Total marzo", 150],
        [null, "TOTAL GASTOS", 150],
        [null, "Subtotal", 150],
        [null, "Total:", 150],
      ];
      const strict = run(sheetOf(rows), {
        skipIfContains: ["total", "subtotal"],
      });
      const filled = run(sheetOf(rows), {
        skipIfContains: ["total", "subtotal"],
        date: { ...BASE.date, fillDown: true },
      });
      const imported = filled.rows.map((r) => r.description).join(",");
      return (
        strict.rows.length === 1 &&
        strict.errors.length === 2 &&
        imported === "pan,leche,Totalplay" &&
        filled.skipped.length === 4
      );
    },
  ],
  [
    "22 editing an amount keeps the other ids when there is a balance column",
    () => {
      const table = {
        amount: {
          mode: "signed" as const,
          column: "C",
          expenseSign: "positive" as const,
        },
      };
      const before = run(
        sheetOf([
          ["Fecha", "Desc", "Monto", "Saldo"],
          ["01/03/2024", "a", 10, 990],
          ["02/03/2024", "b", 20, 970],
          ["03/03/2024", "c", 30, 940],
        ]),
        table,
      );
      const after = run(
        sheetOf([
          ["Fecha", "Desc", "Monto", "Saldo"],
          ["01/03/2024", "a", 15, 985],
          ["02/03/2024", "b", 20, 965],
          ["03/03/2024", "c", 30, 935],
        ]),
        table,
      );
      const [, b1, c1] = sheetFingerprints(before.rows);
      const [, b2, c2] = sheetFingerprints(after.rows);
      return b1 === b2 && c1 === c2;
    },
  ],
  [
    "23 month sections follow the declared order and ignore titles above the header",
    () => {
      const section = (order: "ascending" | "descending") => ({
        date: {
          ...BASE.date,
          kind: "day_with_section_month" as const,
          year: 2024,
          sectionOrder: order,
        },
      });
      const descending = run(
        sheetOf([
          ["Dia", "Desc", "Monto"],
          ["Diciembre", null, null],
          [5, "a", 1],
          ["Noviembre", null, null],
          [5, "b", 1],
          ["Octubre", null, null],
          [5, "c", 1],
        ]),
        section("descending"),
      );
      const ascending = run(
        sheetOf([
          ["Dia", "Desc", "Monto"],
          ["Noviembre", null, null],
          [5, "a", 1],
          ["Diciembre", null, null],
          [5, "b", 1],
          ["Enero", null, null],
          [5, "c", 1],
        ]),
        section("ascending"),
      );
      const titled = run(
        sheetOf([
          ["Dic", "Gastos", null],
          ["Dia", "Desc", "Monto"],
          ["Enero", null, null],
          [5, "a", 1],
        ]),
        { ...section("ascending"), firstDataRow: 3 },
      );
      const below = run(
        sheetOf([
          ["Dia", "Desc", "Monto"],
          ["Enero", null, null],
          [5, "a", 1],
        ]),
        { ...section("ascending"), firstDataRow: 3 },
      );
      const dates = (r: ReturnType<typeof run>) =>
        r.rows.map((x) => x.occurredOn).join(",");
      return (
        dates(descending) === "2024-12-05,2024-11-05,2024-10-05" &&
        dates(ascending) === "2024-11-05,2024-12-05,2025-01-05" &&
        dates(titled) === "2024-01-05" &&
        dates(below) === "2024-01-05"
      );
    },
  ],
  [
    "24 inserting a row with the same date and amount only adds that row",
    () => {
      const table = {
        amount: {
          mode: "signed" as const,
          column: "D",
          expenseSign: "positive" as const,
        },
      };
      const before = sheetFingerprints(
        run(
          sheetOf([
            ["Fecha", "Desc", null, "Monto"],
            ["01/03/2024", "cafe", null, 5],
            ["01/03/2024", "bus", null, 5],
          ]),
          table,
        ).rows,
      );
      const afterRows = run(
        sheetOf([
          ["Fecha", "Desc", null, "Monto"],
          ["01/03/2024", "pan", null, 5],
          ["01/03/2024", "cafe", null, 5],
          ["01/03/2024", "bus", null, 5],
        ]),
        table,
      ).rows;
      const fresh = sheetFingerprints(afterRows).flatMap((id, i) =>
        before.includes(id) ? [] : [afterRows[i].description],
      );
      return fresh.join(",") === "pan";
    },
  ],
  [
    "25 amounts follow a strict format",
    () => {
      const comma = { decimal: ",", thousands: "." } as const;
      const dot = { decimal: ".", thousands: "," } as const;
      const bad = [
        ["2024-01-05", comma],
        ["1-2", comma],
        ["10 - 20", comma],
        ["(1)(2)", comma],
        ["+-5", comma],
        ["12,5", dot],
        ["100 CR", comma],
        ["1.23.4", comma],
      ] as const;
      const good = [
        ["1.234,50", comma, 1234.5],
        ["-1.234", comma, -1234],
        ["(50)", comma, -50],
        ["$ 1.000", comma, 1000],
        ["1,234.50", dot, 1234.5],
        ["1234.5", dot, 1234.5],
        ["45 USD", dot, 45],
      ] as const;
      return (
        bad.every(([v, f]) =>
          String(attempt(() => parseSheetAmount(v, f))).startsWith("error"),
        ) && good.every(([v, f, want]) => parseSheetAmount(v, f) === want)
      );
    },
  ],
  [
    "26 a carried date never crosses a section, a skipped row or an error",
    () => {
      const fill = { date: { ...BASE.date, fillDown: true } };
      const afterError = run(
        sheetOf([
          ["Fecha", "Desc", "Monto"],
          ["01/03/2024", "a", 10],
          ["31/02/2024", "b", 20],
          [null, "c", 30],
        ]),
        fill,
      );
      const afterSkip = run(
        sheetOf([
          ["Fecha", "Desc", "Monto"],
          ["31/03/2024", "a", 10],
          ["Total", null, 10],
          [null, "abril", 500],
        ]),
        { ...fill, skipIfContains: ["total"] },
      );
      const sections = run(
        sheetOf([
          ["Dia", "Desc", "Monto"],
          ["Enero", null, null],
          [31, "a", 10],
          ["Febrero", null, null],
          [null, "b", 20],
        ]),
        {
          date: {
            ...BASE.date,
            kind: "day_with_section_month",
            year: 2024,
            fillDown: true,
            sectionOrder: "ascending",
          },
        },
      );
      return (
        afterError.rows.length === 1 &&
        afterSkip.rows.length === 1 &&
        sections.rows.length === 1
      );
    },
  ],
  [
    "27 the same data in xlsx and CSV gets the same id",
    () => {
      const xlsx = readWorkbook(
        bytesOf(
          sheetOf([
            ["Fecha", "Desc", "Monto"],
            ["01/03/2024", "a", 20.5],
          ]),
        ),
      ).sheets;
      const dated = sheetOf([
        ["Fecha", "Desc", "Monto"],
        [null, "a", 20.5],
      ]);
      dated["A2"] = { t: "d", v: new Date(Date.UTC(2024, 2, 1)) };
      const csv = readWorkbook(
        new TextEncoder().encode("Fecha;Desc;Monto\n01/03/2024;a;20,50\n"),
      ).sheets;
      const table = { ...BASE };
      const ids = [xlsx, readWorkbook(bytesOf(dated)).sheets, csv].map(
        (g) =>
          sheetFingerprints(
            applyRecipe(g, { tables: [{ ...table, sheet: g[0].name }] }).rows,
          )[0],
      );
      return ids[0] !== undefined && ids.every((id) => id === ids[0]);
    },
  ],
  [
    "28 UTF-16 CSV is read and a stray byte only affects its own line",
    () => {
      const text = "Fecha,Desc,Monto\n01/03/2024,Café,10\n";
      const utf16 = new Uint8Array([
        0xff,
        0xfe,
        ...Array.from(text).flatMap((ch) => [
          ch.charCodeAt(0) & 0xff,
          ch.charCodeAt(0) >> 8,
        ]),
      ]);
      const first = readWorkbook(utf16).sheets[0].cell("B", 2);
      const mixed = new Uint8Array([
        ...new TextEncoder().encode(
          "Fecha,Desc,Monto\n01/03/2024,café,10\n02/03/2024,",
        ),
        0xe9,
        ...new TextEncoder().encode("té,20\n"),
      ]);
      const read = readWorkbook(mixed);
      return (
        first === "Café" &&
        read.sheets[0].cell("B", 2) === "café" &&
        read.warnings.length === 1
      );
    },
  ],
  [
    "29 an error cell in a grid only loses that cell",
    () => {
      const sheet = sheetOf([
        ["Cat", "Ene", "Feb", "Mar"],
        ["Comida", 100, 200, 300],
      ]);
      sheet["C2"] = { t: "e", v: 0x17, w: "#REF!" };
      const result = run(sheet, {
        layout: "grid",
        amount: null,
        descriptionColumns: [],
        date: { ...BASE.date, kind: "month", year: 2024 },
        grid: {
          orientation: "dates_across",
          headerRow: 1,
          categoryColumn: "A",
          valueColumns: ["B", "C", "D"],
          kind: "expense",
        },
      });
      return result.rows.length === 2 && result.errors.length === 1;
    },
  ],
  [
    "30 files over the size cap are refused before parsing",
    () => {
      const big = new Uint8Array(MAX_FILE_BYTES + 1).fill(0x31);
      const started = Date.now();
      try {
        readWorkbook(big);
        return false;
      } catch (error) {
        return error instanceof SheetFileError && Date.now() - started < 500;
      }
    },
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
