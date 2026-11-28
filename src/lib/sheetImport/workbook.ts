import * as XLSX from "xlsx";
import * as cptable from "xlsx/dist/cpexcel.full";

import {
  hasSignature,
  isSpreadsheetBinary,
  PDF_SIGNATURE,
} from "@/lib/sheetImport/signature";

XLSX.set_cptable(cptable);

export const MAX_WORKBOOK_CELLS = 200_000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type CellValue = string | number | boolean | Date;

export interface SheetCell {
  column: string;
  index: number;
  value: CellValue | null;
  error: string | null;
}

export interface SheetGrid {
  name: string;
  rowCount: number;
  columnCount: number;
  merges: string[];
  rows(): number[];
  rowCells(row: number): SheetCell[];
  cell(column: string, row: number): CellValue | null;
  cellError(column: string, row: number): string | null;
}

export class SheetFileError extends Error {}

export interface ReadWorkbook {
  sheets: SheetGrid[];
  warnings: string[];
}

const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];
const NEWLINE = 0x0a;

function decodeLines(bytes: Uint8Array, warnings: string[]): string {
  const strict = new TextDecoder("utf-8", { fatal: true });
  const legacy = new TextDecoder("windows-1252");
  const lines: string[] = [];
  const fallbackLines: number[] = [];
  let start = 0;
  for (let i = 0; i <= bytes.length; i++) {
    if (i < bytes.length && bytes[i] !== NEWLINE) continue;
    const line = bytes.subarray(start, i);
    try {
      lines.push(strict.decode(line));
    } catch {
      lines.push(legacy.decode(line));
      fallbackLines.push(lines.length);
    }
    start = i + 1;
  }
  if (fallbackLines.length) {
    warnings.push(
      `Lines ${fallbackLines.join(", ")} are not valid UTF-8 and were read as Windows-1252`,
    );
  }
  return lines.join("\n").replace(/^\uFEFF/, "");
}

function decodeText(bytes: Uint8Array, warnings: string[]): string {
  if (hasSignature(bytes, UTF16LE_BOM)) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (hasSignature(bytes, UTF16BE_BOM)) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  return decodeLines(bytes, warnings);
}

function cellFrom(raw: XLSX.CellObject): Pick<SheetCell, "value" | "error"> {
  if (raw.t === "e") return { value: null, error: raw.w ?? "error cell" };
  const missing = raw.v === undefined || raw.v === null || raw.t === "z";
  if (missing && raw.f !== undefined) {
    return { value: null, error: "formula without a saved value" };
  }
  return { value: missing ? null : (raw.v as CellValue), error: null };
}

function gridFrom(
  name: string,
  sheet: XLSX.WorkSheet,
  budget: { cells: number },
): SheetGrid {
  const byRow = new Map<number, Map<number, SheetCell>>();
  let rowCount = 0;
  let columnCount = 0;
  for (const key of Object.keys(sheet)) {
    if (key.startsWith("!")) continue;
    const cell = cellFrom(sheet[key] as XLSX.CellObject);
    if (cell.value === null && cell.error === null) continue;
    budget.cells += 1;
    if (budget.cells > MAX_WORKBOOK_CELLS) {
      throw new SheetFileError("The file has too many cells to import");
    }
    const { r, c } = XLSX.utils.decode_cell(key);
    const row = r + 1;
    rowCount = Math.max(rowCount, row);
    columnCount = Math.max(columnCount, c + 1);
    const cells = byRow.get(row) ?? new Map<number, SheetCell>();
    cells.set(c, { column: XLSX.utils.encode_col(c), index: c, ...cell });
    byRow.set(row, cells);
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  const lookup = (column: string, row: number) =>
    byRow.get(row)?.get(XLSX.utils.decode_col(column));
  return {
    name,
    rowCount,
    columnCount,
    merges: (sheet["!merges"] ?? []).map((m) => XLSX.utils.encode_range(m)),
    rows: () => rows,
    rowCells: (row) =>
      [...(byRow.get(row)?.values() ?? [])].sort((a, b) => a.index - b.index),
    cell: (column, row) => lookup(column, row)?.value ?? null,
    cellError: (column, row) => lookup(column, row)?.error ?? null,
  };
}

function parse(bytes: Uint8Array, warnings: string[]): XLSX.WorkBook {
  const options = { cellDates: true, raw: true, nodim: true } as const;
  if (isSpreadsheetBinary(bytes)) {
    return XLSX.read(bytes, { ...options, type: "array" });
  }
  if (hasSignature(bytes, PDF_SIGNATURE)) {
    throw new SheetFileError("PDF files are not spreadsheets");
  }
  const text = decodeText(bytes, warnings);
  if (!text.trim() || text.includes("\u0000")) {
    throw new SheetFileError("The file is empty or not a spreadsheet");
  }
  return XLSX.read(text, { ...options, type: "string" });
}

export function readWorkbook(data: ArrayBuffer | Uint8Array): ReadWorkbook {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length > MAX_FILE_BYTES) {
    throw new SheetFileError("The file is too large to import");
  }
  const warnings: string[] = [];
  let workbook: XLSX.WorkBook;
  try {
    workbook = parse(bytes, warnings);
  } catch (error) {
    if (error instanceof SheetFileError) throw error;
    throw new SheetFileError("The file could not be read as a spreadsheet");
  }
  const budget = { cells: 0 };
  const sheets = workbook.SheetNames.map((name) =>
    gridFrom(name, workbook.Sheets[name], budget),
  );
  return { sheets, warnings };
}
