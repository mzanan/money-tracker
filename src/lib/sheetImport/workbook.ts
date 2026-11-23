import * as XLSX from "xlsx";
import * as cptable from "xlsx/dist/cpexcel.full";

XLSX.set_cptable(cptable);

export const MAX_WORKBOOK_CELLS = 200_000;

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

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46];

function hasSignature(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[i] === byte);
}

function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
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

function parse(bytes: Uint8Array): XLSX.WorkBook {
  const options = { cellDates: true, raw: true, nodim: true } as const;
  if (
    hasSignature(bytes, ZIP_SIGNATURE) ||
    hasSignature(bytes, OLE_SIGNATURE)
  ) {
    return XLSX.read(bytes, { ...options, type: "array" });
  }
  if (hasSignature(bytes, PDF_SIGNATURE)) {
    throw new SheetFileError("PDF files are not spreadsheets");
  }
  const text = decodeText(bytes);
  if (!text.trim() || text.includes("\u0000")) {
    throw new SheetFileError("The file is empty or not a spreadsheet");
  }
  return XLSX.read(text, { ...options, type: "string" });
}

export function readWorkbook(data: ArrayBuffer | Uint8Array): SheetGrid[] {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let workbook: XLSX.WorkBook;
  try {
    workbook = parse(bytes);
  } catch (error) {
    if (error instanceof SheetFileError) throw error;
    throw new SheetFileError("The file could not be read as a spreadsheet");
  }
  const budget = { cells: 0 };
  return workbook.SheetNames.map((name) =>
    gridFrom(name, workbook.Sheets[name], budget),
  );
}

export function columnLetter(index: number): string {
  return XLSX.utils.encode_col(index);
}
