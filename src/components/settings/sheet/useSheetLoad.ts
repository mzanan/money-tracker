"use client";

import { useState } from "react";

import { getLastImportDate } from "@/lib/actions/csvImport";
import { readSheetLayout } from "@/lib/actions/sheetImport";
import { getSheetLayouts } from "@/lib/actions/sheetImportLog";
import type { CsvInitialFile } from "@/lib/csv/initialImport";
import { presetForCsvText } from "@/lib/csv/presets";
import {
  conventionsBySignature,
  layoutSource,
  reconcileRecipe,
  tableLayoutKeys,
  patchTable,
  uniqueSignatures,
  withReading,
  type ReadingChoice,
  type ReadingConflict,
} from "@/lib/sheetImport/layout";
import {
  mergeRecipes,
  type SheetRecipe,
  type TableRecipe,
} from "@/lib/sheetImport/recipe";
import { sourceFromFileName } from "@/lib/sheetImport/review";
import { isSpreadsheetBinary } from "@/lib/sheetImport/signature";
import type { SheetGrid } from "@/lib/sheetImport/workbook";

type Phase = "idle" | "reading" | "ready";

export function useSheetLoad() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [presetFile, setPresetFile] = useState<CsvInitialFile | null>(null);
  const [grids, setGrids] = useState<SheetGrid[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recipe, setRecipe] = useState<SheetRecipe | null>(null);
  const [source, setSource] = useState("");
  const [conflicts, setConflicts] = useState<ReadingConflict[]>([]);
  const [choices, setChoices] = useState<Record<number, ReadingChoice>>({});

  function reset() {
    setPhase("idle");
    setError(null);
    setFileName("");
    setPresetFile(null);
    setGrids([]);
    setWarnings([]);
    setRecipe(null);
    setSource("");
    setConflicts([]);
    setChoices({});
  }

  async function read(bytes: Uint8Array, name: string) {
    setFileName(name);
    if (!isSpreadsheetBinary(bytes)) {
      const text = new TextDecoder().decode(bytes);
      const preset = presetForCsvText(text);
      if (preset) {
        const last = await getLastImportDate(preset.source);
        setPresetFile({
          name,
          text,
          presetId: preset.id,
          lastImportDate: last.ok ? (last.data?.date ?? null) : null,
        });
        return;
      }
    }
    setPhase("reading");
    try {
      const [{ readWorkbook, SheetFileError }, { encodeWorkbook }] =
        await Promise.all([
          import("@/lib/sheetImport/workbook"),
          import("@/lib/sheetImport/encode"),
        ]);
      let workbook;
      try {
        workbook = readWorkbook(bytes);
      } catch (cause) {
        setError(
          cause instanceof SheetFileError
            ? cause.message
            : "The file could not be read as a spreadsheet",
        );
        setPhase("idle");
        return;
      }
      const recipes: SheetRecipe[] = [];
      for (const part of encodeWorkbook(workbook.sheets)) {
        const result = await readSheetLayout(part);
        if (!result.ok) {
          setError(result.error);
          setPhase("idle");
          return;
        }
        recipes.push(result.data!.recipe);
      }
      const merged = mergeRecipes(recipes);
      const keys = tableLayoutKeys(merged, workbook.sheets);
      const saved = await getSheetLayouts(uniqueSignatures(keys));
      const layouts = saved.ok ? (saved.data?.layouts ?? []) : [];
      setGrids(workbook.sheets);
      setWarnings(workbook.warnings);
      const reconciled = reconcileRecipe(
        merged,
        keys,
        conventionsBySignature(layouts),
        workbook.sheets,
      );
      setRecipe(reconciled.recipe);
      setConflicts(reconciled.conflicts);
      setSource(
        layoutSource(layouts, reconciled.matchedKeys) ??
          sourceFromFileName(name),
      );
      setPhase("ready");
    } catch {
      setError("Could not read this spreadsheet right now. Try again later.");
      setPhase("idle");
    }
  }

  function patchRecipeTable(index: number, patch: Partial<TableRecipe>) {
    setRecipe((current) =>
      current ? patchTable(current, index, patch) : current,
    );
  }

  function chooseReading(conflict: ReadingConflict, choice: ReadingChoice) {
    setRecipe((current) =>
      current ? withReading(current, conflict, choice) : current,
    );
    setChoices((current) => ({ ...current, [conflict.table]: choice }));
  }

  return {
    phase,
    error,
    fileName,
    presetFile,
    grids,
    warnings,
    recipe,
    source,
    setSource,
    conflicts,
    choices,
    read,
    reset,
    patchRecipeTable,
    chooseReading,
  };
}
