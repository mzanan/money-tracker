import type { SheetGrid } from "@/lib/sheetImport/workbook";
import type { SelectOption } from "@/types/select";

const MAX_LABEL_CHARS = 30;

export function columnLetter(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

export function columnOptions(
  grid: SheetGrid,
  firstDataRow: number,
): SelectOption[] {
  const headerRow = firstDataRow - 1;
  return Array.from({ length: grid.columnCount }, (_, index) => {
    const value = columnLetter(index);
    const header = headerRow > 0 ? grid.cell(value, headerRow) : null;
    const sample = header ?? grid.cell(value, firstDataRow);
    const text =
      sample === null
        ? ""
        : sample instanceof Date
          ? sample.toISOString().slice(0, 10)
          : String(sample).slice(0, MAX_LABEL_CHARS);
    return { value, label: text ? `${value} · ${text}` : value };
  });
}
