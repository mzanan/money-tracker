import { readFileSync } from "node:fs";
import path from "node:path";

import { proposeSheetRecipe } from "@/lib/ai/sheetRecipe";
import { applyRecipe, type SheetRow } from "@/lib/sheetImport/apply";
import { encodeWorkbook } from "@/lib/sheetImport/encode";
import { sheetFingerprints } from "@/lib/sheetImport/fingerprint";
import { fold } from "@/lib/sheetImport/parse";
import { SheetRecipeSchema, type SheetRecipe } from "@/lib/sheetImport/recipe";
import { readWorkbook } from "@/lib/sheetImport/workbook";

interface Expected {
  date: string;
  amount: number;
  desc: string;
  currency?: string;
}

const DIR = path.join(process.cwd(), "scripts/fixtures/sheet-import");
const SHEETS = Array.from({ length: 10 }, (_, i) => `sheet${i + 1}`);
const useAi = process.argv.includes("--ai");

function signedAmount(row: SheetRow): number {
  return (
    Math.round((row.kind === "expense" ? -row.amount : row.amount) * 100) / 100
  );
}

function score(rows: SheetRow[], expected: Expected[]) {
  const pool = [...rows];
  let matched = 0;
  let descOk = 0;
  let currencyOk = 0;
  for (const want of expected) {
    const hit = pool.findIndex(
      (got) =>
        got.occurredOn === want.date &&
        Math.abs(signedAmount(got) - want.amount) < 0.005,
    );
    if (hit < 0) continue;
    const [got] = pool.splice(hit, 1);
    matched++;
    if (fold(got.description).includes(fold(want.desc))) descOk++;
    if (!want.currency || got.currency === want.currency) currencyOk++;
  }
  const total = expected.length;
  return {
    perfect:
      matched === total &&
      pool.length === 0 &&
      descOk === total &&
      currencyOk === total,
    summary: `${matched}/${total} matched, ${pool.length} extra, ${descOk} desc, ${currencyOk} currency`,
  };
}

async function main() {
  const oracle = JSON.parse(
    readFileSync(path.join(DIR, "oracle.json"), "utf8"),
  ) as Record<string, unknown>;
  let failures = 0;
  for (const name of SHEETS) {
    const grids = readWorkbook(
      readFileSync(path.join(DIR, `${name}.xlsx`)),
    ).sheets;
    const expected = JSON.parse(
      readFileSync(path.join(DIR, `${name}.expected.json`), "utf8"),
    ) as Expected[];
    const recipe: SheetRecipe = useAi
      ? await proposeSheetRecipe(encodeWorkbook(grids))
      : SheetRecipeSchema.parse(oracle[name]);
    const { rows, errors, skipped } = applyRecipe(grids, recipe);
    const result = score(rows, expected);
    const ids = sheetFingerprints(rows);
    const uniqueIds = new Set(ids).size === ids.length;
    if (!result.perfect || !uniqueIds) failures++;
    console.log(
      `${name} ${result.perfect && uniqueIds ? "PASS" : "FAIL"} ${result.summary}, ids unique ${uniqueIds}, ${skipped.length} skipped, ${errors.length} not read${errors.length ? ` (${errors.map((e) => `${e.sheet}!R${e.row} ${e.reason}`).join("; ")})` : ""}`,
    );
  }
  console.log(failures ? `${failures} failing` : "all passing");
  process.exitCode = failures ? 1 : 0;
}

void main();
