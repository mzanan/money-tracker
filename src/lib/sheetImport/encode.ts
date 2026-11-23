import {
  columnLetter,
  type CellValue,
  type SheetGrid,
} from "@/lib/sheetImport/workbook";
import { isBlank } from "@/lib/sheetImport/parse";

const HEAD_ROWS = 40;
const TAIL_ROWS = 5;

function render(value: CellValue): string {
  if (value instanceof Date) return `date(${value.toISOString().slice(0, 10)})`;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

function encodeSheet(grid: SheetGrid): string {
  const columns = Array.from({ length: grid.columnCount }, (_, i) =>
    columnLetter(i),
  );
  const rows: string[] = [];
  for (let row = 1; row <= grid.rowCount; row++) {
    const cells = columns.flatMap((column) => {
      const value = grid.cell(column, row);
      return value === null || isBlank(value)
        ? []
        : [`${column}:${render(value)}`];
    });
    if (cells.length) rows.push(`R${row} | ${cells.join(" | ")}`);
  }
  const lastColumn = columns.at(-1) ?? "A";
  const lines = [
    `Sheet ${JSON.stringify(grid.name)} (rows 1-${grid.rowCount}, columns A-${lastColumn})`,
  ];
  if (grid.merges.length) lines.push(`merged: ${grid.merges.join(", ")}`);
  if (rows.length > HEAD_ROWS + TAIL_ROWS) {
    lines.push(
      ...rows.slice(0, HEAD_ROWS),
      `... ${rows.length - HEAD_ROWS - TAIL_ROWS} non-empty rows omitted ...`,
      ...rows.slice(-TAIL_ROWS),
    );
  } else {
    lines.push(...rows);
  }
  return lines.join("\n");
}

export function encodeWorkbook(grids: SheetGrid[]): string {
  return grids.map(encodeSheet).join("\n\n");
}
