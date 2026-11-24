import { columnLetter } from "@/lib/sheetImport/columns";
import { fold, isBlank, utcYmd } from "@/lib/sheetImport/parse";
import type { SheetCell, SheetGrid } from "@/lib/sheetImport/workbook";

export const MAX_ENCODED_CHARS = 150_000;

const SAMPLE_LEVELS = [
  { head: 40, tail: 5, repeatHead: 8, repeatTail: 3 },
  { head: 20, tail: 3, repeatHead: 5, repeatTail: 2 },
  { head: 10, tail: 2, repeatHead: 3, repeatTail: 1 },
  { head: 5, tail: 1, repeatHead: 2, repeatTail: 0 },
];
const MAX_CELL_CHARS = 120;
const MIN_HEADER_CELLS = 2;
const TRUNCATED_NOTE = "\n... rest of this sheet omitted ...";

interface Sample {
  head: number;
  tail: number;
}

function render(cell: SheetCell): string {
  if (cell.error !== null) return `error(${cell.error})`;
  const value = cell.value;
  if (value instanceof Date) return `date(${utcYmd(value)})`;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(String(value).slice(0, MAX_CELL_CHARS));
}

function encodedRows(grid: SheetGrid): string[] {
  return grid.rows().flatMap((row) => {
    const cells = grid
      .rowCells(row)
      .filter((cell) => cell.error !== null || !isBlank(cell.value))
      .map((cell) => `${cell.column}:${render(cell)}`);
    return cells.length ? [`R${row} | ${cells.join(" | ")}`] : [];
  });
}

function headerSignature(grid: SheetGrid): string | null {
  for (const row of grid.rows()) {
    const labels = grid
      .rowCells(row)
      .filter((cell) => typeof cell.value === "string" && fold(cell.value));
    if (labels.length >= MIN_HEADER_CELLS) {
      return labels.map((cell) => `${cell.column}=${fold(cell.value)}`).join("|");
    }
  }
  return null;
}

function encodeSheet(
  grid: SheetGrid,
  rows: string[],
  sample: Sample,
  sameAs: string | null,
): string {
  const lastColumn = columnLetter(Math.max(grid.columnCount - 1, 0));
  const note = sameAs ? `, same header as ${JSON.stringify(sameAs)}` : "";
  const lines = [
    `Sheet ${JSON.stringify(grid.name)} (rows 1-${grid.rowCount}, columns A-${lastColumn}${note})`,
  ];
  if (grid.merges.length) lines.push(`merged: ${grid.merges.join(", ")}`);
  if (rows.length > sample.head + sample.tail) {
    lines.push(
      ...rows.slice(0, sample.head),
      `... ${rows.length - sample.head - sample.tail} non-empty rows omitted ...`,
      ...rows.slice(rows.length - sample.tail),
    );
  } else {
    lines.push(...rows);
  }
  return lines.join("\n");
}

function sheetSample(
  level: (typeof SAMPLE_LEVELS)[number],
  repeated: boolean,
): Sample {
  return repeated
    ? { head: level.repeatHead, tail: level.repeatTail }
    : { head: level.head, tail: level.tail };
}

function fitSheet(text: string): string {
  return text.length <= MAX_ENCODED_CHARS
    ? text
    : `${text.slice(0, MAX_ENCODED_CHARS - TRUNCATED_NOTE.length)}${TRUNCATED_NOTE}`;
}

function inBatches(parts: string[]): string[] {
  const batches: string[] = [];
  let current = "";
  for (const part of parts) {
    const next = current ? `${current}\n\n${part}` : part;
    if (current && next.length > MAX_ENCODED_CHARS) {
      batches.push(current);
      current = part;
    } else {
      current = next;
    }
  }
  if (current) batches.push(current);
  return batches;
}

export function encodeWorkbook(grids: SheetGrid[]): string[] {
  const rows = grids.map(encodedRows);
  const firstWithHeader = new Map<string, string>();
  const sameAs = grids.map((grid) => {
    const signature = headerSignature(grid);
    if (!signature) return null;
    const first = firstWithHeader.get(signature);
    if (first) return first;
    firstWithHeader.set(signature, grid.name);
    return null;
  });
  for (const level of SAMPLE_LEVELS) {
    const encoded = grids
      .map((grid, i) =>
        encodeSheet(grid, rows[i], sheetSample(level, Boolean(sameAs[i])), sameAs[i]),
      )
      .join("\n\n");
    if (encoded.length <= MAX_ENCODED_CHARS) return [encoded];
  }
  const smallest = SAMPLE_LEVELS[SAMPLE_LEVELS.length - 1];
  return inBatches(
    grids.map((grid, i) =>
      fitSheet(encodeSheet(grid, rows[i], sheetSample(smallest, false), null)),
    ),
  );
}
