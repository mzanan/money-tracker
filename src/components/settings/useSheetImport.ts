"use client";

import { toast } from "sonner";

import {
  allRowsSelected,
  canSubmitImport,
  duplicateIndexes,
  needsCurrency,
  selectedRowCount,
} from "@/lib/sheetImport/selection";
import type { ReadingChoice, ReadingConflict } from "@/lib/sheetImport/layout";
import type { TableRecipe } from "@/lib/sheetImport/recipe";

import { useSheetChecks } from "./sheet/useSheetChecks";
import { useSheetInput } from "./sheet/useSheetInput";
import { useSheetLoad } from "./sheet/useSheetLoad";
import { useSheetReview } from "./sheet/useSheetReview";
import { useSheetSubmit } from "./sheet/useSheetSubmit";

export function useSheetImport() {
  const input = useSheetInput();
  const load = useSheetLoad();
  const review = useSheetReview(load.recipe, load.grids);
  const checks = useSheetChecks({
    rows: review.rows,
    source: load.source,
    currency: review.currency,
    currencyMap: review.currencyMap,
  });

  function reset() {
    input.reset();
    load.reset();
    review.reset();
    checks.reset();
  }

  const { pending, submit } = useSheetSubmit({
    rows: review.rows,
    checks: checks.checks,
    recipe: load.recipe,
    toggled: review.toggled,
    currency: review.currency,
    currencyMap: review.currencyMap,
    source: load.source,
    fileName: load.fileName,
    notRead: review.notRead,
    layoutKeys: review.layoutKeys,
    onDone: reset,
  });

  async function loadBytes(bytes: Uint8Array, name: string) {
    reset();
    await load.read(bytes, name);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await loadBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  }

  async function handlePaste() {
    const text = input.pasted.trim();
    if (!text) {
      toast.error("Paste something first");
      return;
    }
    await loadBytes(new TextEncoder().encode(text), "Pasted data");
  }

  function changeSource(value: string) {
    load.setSource(value);
    checks.invalidate();
  }

  function changeCurrency(value: string) {
    review.setCurrency(value);
    checks.invalidate();
  }

  function mapCurrency(raw: string, code: string) {
    review.mapCurrency(raw, code);
    checks.invalidate();
  }

  function updateTable(index: number, patch: Partial<TableRecipe>) {
    load.patchRecipeTable(index, patch);
    review.clearToggled();
    checks.invalidate();
  }

  function chooseReading(conflict: ReadingConflict, choice: ReadingChoice) {
    load.chooseReading(conflict, choice);
    review.clearToggled();
    checks.invalidate();
  }

  const duplicates = duplicateIndexes(checks.checks);
  const allDuplicatesSelected = allRowsSelected(
    duplicates,
    checks.checks,
    review.toggled,
  );

  function toggleAllDuplicates() {
    review.setRows(duplicates, !allDuplicatesSelected);
  }

  const selectedCount = selectedRowCount(
    review.rows,
    checks.checks,
    review.toggled,
  );
  const canSubmit = canSubmitImport({
    source: load.source,
    checks: checks.checks,
    selectedCount,
    needsCurrency: needsCurrency(
      review.missingCurrency,
      review.unknownCurrencies,
      review.currency,
      review.currencyMap,
    ),
    conflicts: load.conflicts,
    choices: load.choices,
  });

  return {
    inputRef: input.inputRef,
    pending,
    mode: input.mode,
    pasted: input.pasted,
    phase: load.phase,
    error: load.error,
    fileName: load.fileName,
    presetFile: load.presetFile,
    warnings: load.warnings,
    recipe: load.recipe,
    grids: load.grids,
    applied: review.applied,
    rows: review.rows,
    source: load.source,
    currency: review.currency,
    currencyMap: review.currencyMap,
    missingCurrency: review.missingCurrency,
    unknownCurrencies: review.unknownCurrencies,
    notRead: review.notRead,
    toggled: review.toggled,
    checks: checks.checks,
    checkError: checks.checkError,
    checking: checks.checking,
    selectedCount,
    duplicateCount: duplicates.length,
    allDuplicatesSelected,
    toggleAllDuplicates,
    canSubmit,
    setMode: input.setMode,
    setPasted: input.setPasted,
    showCorrections: review.showCorrections,
    setShowCorrections: review.setShowCorrections,
    conflicts: load.conflicts,
    choices: load.choices,
    chooseReading,
    changeSource,
    changeCurrency,
    mapCurrency,
    handleFile,
    handlePaste,
    updateTable,
    toggleRow: review.toggleRow,
    retryCheck: checks.retry,
    reset,
    submit,
  };
}
