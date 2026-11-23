import * as XLSX from "xlsx";
import * as cptable from "xlsx/dist/cpexcel.full";

XLSX.set_cptable(cptable);

export type CellValue = string | number | boolean | Date;

export interface SheetGrid {
  name: string;
  rowCount: number;
  columnCount: number;
  merges: string[];
  cell(column: string, row: number): CellValue | null;
}

function gridFrom(name: string, sheet: XLSX.WorkSheet): SheetGrid {
  const range = sheet["!ref"]
    ? XLSX.utils.decode_range(sheet["!ref"])
    : { s: { r: 0, c: 0 }, e: { r: -1, c: -1 } };
  return {
    name,
    rowCount: range.e.r + 1,
    columnCount: range.e.c + 1,
    merges: (sheet["!merges"] ?? []).map((m) => XLSX.utils.encode_range(m)),
    cell(column, row) {
      const value = sheet[`${column}${row}`]?.v;
      return value === undefined || value === null ? null : value;
    },
  };
}

export function readWorkbook(data: ArrayBuffer | Uint8Array): SheetGrid[] {
  const workbook = XLSX.read(data, {
    type: "array",
    cellDates: true,
    raw: true,
    dense: false,
  });
  return workbook.SheetNames.map((name) =>
    gridFrom(name, workbook.Sheets[name]),
  );
}

export function columnLetter(index: number): string {
  return XLSX.utils.encode_col(index);
}
