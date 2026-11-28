"use client";

import { useMemo, useState } from "react";

import { applyRecipe } from "@/lib/sheetImport/apply";
import {
  isSkippedRow,
  rowsWithoutCurrency,
  skippedCurrencyIssues,
  unknownCurrencyValues,
  type CurrencyMap,
} from "@/lib/sheetImport/currency";
import { tableLayoutKeys } from "@/lib/sheetImport/layout";
import type { SheetRecipe } from "@/lib/sheetImport/recipe";
import { reviewRows } from "@/lib/sheetImport/review";
import type { SheetGrid } from "@/lib/sheetImport/workbook";

export function useSheetReview(recipe: SheetRecipe | null, grids: SheetGrid[]) {
  const [currency, setCurrency] = useState("");
  const [currencyMap, setCurrencyMap] = useState<CurrencyMap>({});
  const [showCorrections, setShowCorrections] = useState(false);
  const [toggled, setToggled] = useState<ReadonlySet<number>>(new Set());

  const layoutKeys = useMemo(
    () => (recipe ? tableLayoutKeys(recipe, grids) : []),
    [recipe, grids],
  );
  const applied = useMemo(
    () => (recipe ? applyRecipe(grids, recipe) : null),
    [grids, recipe],
  );
  const allRows = useMemo(
    () => (applied ? reviewRows(applied.rows) : []),
    [applied],
  );
  const rows = useMemo(
    () => allRows.filter((row) => !isSkippedRow(row, currencyMap)),
    [allRows, currencyMap],
  );
  const missingCurrency = useMemo(() => rowsWithoutCurrency(rows), [rows]);
  const unknownCurrencies = useMemo(
    () => unknownCurrencyValues(allRows),
    [allRows],
  );
  const notRead = useMemo(
    () => [
      ...(applied?.errors ?? []),
      ...skippedCurrencyIssues(allRows, currencyMap),
    ],
    [applied, allRows, currencyMap],
  );

  function clearToggled() {
    setToggled(new Set());
  }

  function mapCurrency(raw: string, code: string) {
    setCurrencyMap((current) => ({ ...current, [raw]: code }));
    clearToggled();
  }

  function toggleRow(index: number) {
    setToggled((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function reset() {
    setCurrency("");
    setCurrencyMap({});
    clearToggled();
    setShowCorrections(false);
  }

  return {
    currency,
    setCurrency,
    currencyMap,
    toggled,
    showCorrections,
    setShowCorrections,
    layoutKeys,
    applied,
    allRows,
    rows,
    missingCurrency,
    unknownCurrencies,
    notRead,
    mapCurrency,
    toggleRow,
    clearToggled,
    reset,
  };
}
