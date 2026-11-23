import { isBlank, utcYmd } from "@/lib/sheetImport/parse";
import {
  columnLetter,
  type SheetCell,
  type SheetGrid,
} from "@/lib/sheetImport/workbook";

const HEAD_ROWS = 40;
const TAIL_ROWS = 5;
const MAX_CELL_CHARS = 120;

function render(cell: SheetCell): string {
  if (cell.error !== null) return `error(${cell.error})`;
  const value = cell.value;
  if (value instanceof Date) return `date(${utcYmd(value)})`;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(String(value).slice(0, MAX_CELL_CHARS));
}

function encodeSheet(grid: SheetGrid): string {
  const rows = grid.rows().flatMap((row) => {
    const cells = grid
      .rowCells(row)
      .filter((cell) => cell.error !== null || !isBlank(cell.value))
      .map((cell) => `${cell.column}:${render(cell)}`);
    return cells.length ? [`R${row} | ${cells.join(" | ")}`] : [];
  });
  const lastColumn = columnLetter(Math.max(grid.columnCount - 1, 0));
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
