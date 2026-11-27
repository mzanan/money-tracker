"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getLastImportDate } from "@/lib/actions/csvImport";
import {
  checkSheetRows,
  claimSheetRows,
  readSheetLayout,
  type SheetRowCheck,
} from "@/lib/actions/sheetImport";
import {
  finishSheetImport,
  getSheetLayouts,
  importSheetChunk,
  startSheetImport,
} from "@/lib/actions/sheetImportLog";
import type { CsvInitialFile } from "@/lib/csv/initialImport";
import { presetForCsvText } from "@/lib/csv/presets";
import { applyRecipe } from "@/lib/sheetImport/apply";
import {
  layoutSource,
  layoutsToSave,
  readingsChosen,
  reconcileRecipe,
  tableLayoutKeys,
  withTable,
  type Conventions,
  type ReadingChoice,
  type ReadingConflict,
} from "@/lib/sheetImport/layout";
import {
  mergeRecipes,
  type SheetRecipe,
  type TableRecipe,
} from "@/lib/sheetImport/recipe";
import {
  checkRowOf,
  inChunks,
  isRowSelected,
  isSkippedRow,
  notReadLog,
  reviewRows,
  rowCurrency,
  rowsWithoutCurrency,
  skippedCurrencyIssues,
  skippedRowLog,
  sourceFromFileName,
  toCsvRow,
  unknownCurrencyValues,
  type CurrencyMap,
} from "@/lib/sheetImport/review";
import { isSpreadsheetBinary } from "@/lib/sheetImport/signature";
import type { SheetGrid } from "@/lib/sheetImport/workbook";

type Mode = "file" | "paste";
type Phase = "idle" | "reading" | "ready";

const CHECK_DELAY_MS = 400;
const CHECK_FAILED = "Could not check these rows against your data. Try again.";

export function useSheetImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>("file");
  const [pasted, setPasted] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [presetFile, setPresetFile] = useState<CsvInitialFile | null>(null);
  const [grids, setGrids] = useState<SheetGrid[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recipe, setRecipe] = useState<SheetRecipe | null>(null);
  const [source, setSource] = useState("");
  const [currency, setCurrency] = useState("");
  const [currencyMap, setCurrencyMap] = useState<CurrencyMap>({});
  const [toggled, setToggled] = useState<ReadonlySet<number>>(new Set());
  const [checkRun, setCheckRun] = useState(0);
  const [checks, setChecks] = useState<SheetRowCheck[] | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [showCorrections, setShowCorrections] = useState(false);
  const [conflicts, setConflicts] = useState<ReadingConflict[]>([]);
  const [choices, setChoices] = useState<Record<number, ReadingChoice>>({});

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

  useEffect(() => {
    if (!rows.length) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found: SheetRowCheck[] = [];
      const used: string[] = [];
      const chunks = inChunks(
        rows.map((row) => checkRowOf(row, currency, currencyMap)),
      );
      try {
        for (const chunk of chunks) {
          const claimed = await claimSheetRows({ source, rows: chunk });
          if (cancelled) return;
          if (!claimed.ok) {
            setCheckError(claimed.error);
            return;
          }
          used.push(...(claimed.data?.transactionIds ?? []));
        }
        for (const chunk of chunks) {
          const result = await checkSheetRows({ source, used, rows: chunk });
          if (cancelled) return;
          if (!result.ok) {
            setCheckError(result.error);
            return;
          }
          for (const check of result.data?.checks ?? []) {
            found.push(check);
            if (check.match) used.push(check.match.id);
          }
        }
      } catch {
        if (!cancelled) setCheckError(CHECK_FAILED);
        return;
      }
      if (cancelled) return;
      setCheckError(null);
      setChecks(found);
    }, CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rows, source, currency, currencyMap, checkRun]);

  function reset() {
    setPhase("idle");
    setError(null);
    setFileName("");
    setPresetFile(null);
    setGrids([]);
    setWarnings([]);
    setRecipe(null);
    setSource("");
    setCurrency("");
    setCurrencyMap({});
    setToggled(new Set());
    setChecks(null);
    setCheckError(null);
    setShowCorrections(false);
    setConflicts([]);
    setChoices({});
    setPasted("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function load(bytes: Uint8Array, name: string) {
    reset();
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
      let read;
      try {
        read = readWorkbook(bytes);
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
      for (const part of encodeWorkbook(read.sheets)) {
        const result = await readSheetLayout(part);
        if (!result.ok) {
          setError(result.error);
          setPhase("idle");
          return;
        }
        recipes.push(result.data!.recipe);
      }
      const merged = mergeRecipes(recipes);
      const keys = tableLayoutKeys(merged, read.sheets);
      const signatures = [...new Set(keys.filter((k): k is string => !!k))];
      const saved = await getSheetLayouts(signatures);
      const layouts = saved.ok ? (saved.data?.layouts ?? []) : [];
      setGrids(read.sheets);
      setWarnings(read.warnings);
      const reconciled = reconcileRecipe(
        merged,
        keys,
        new Map<string, Conventions>(
          layouts.map((l) => [l.signature, l.conventions]),
        ),
        read.sheets,
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

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await load(new Uint8Array(await file.arrayBuffer()), file.name);
  }

  async function handlePaste() {
    const text = pasted.trim();
    if (!text) {
      toast.error("Paste something first");
      return;
    }
    await load(new TextEncoder().encode(text), "Pasted data");
  }

  function changeSource(value: string) {
    setSource(value);
    setChecks(null);
  }

  function changeCurrency(value: string) {
    setCurrency(value);
    setChecks(null);
  }

  function mapCurrency(raw: string, code: string) {
    setCurrencyMap((current) => ({ ...current, [raw]: code }));
    setToggled(new Set());
    setChecks(null);
  }

  function retryCheck() {
    setCheckError(null);
    setCheckRun((run) => run + 1);
  }

  function updateTable(index: number, patch: Partial<TableRecipe>) {
    setRecipe((current) =>
      current
        ? {
            tables: current.tables.map((table, i) =>
              i === index ? { ...table, ...patch } : table,
            ),
          }
        : current,
    );
    setToggled(new Set());
    setChecks(null);
  }

  function chooseReading(conflict: ReadingConflict, choice: ReadingChoice) {
    setRecipe((current) =>
      current
        ? withTable(
            current,
            conflict.table,
            choice === "saved" ? conflict.saved : conflict.fresh,
          )
        : current,
    );
    setChoices((current) => ({ ...current, [conflict.table]: choice }));
    setToggled(new Set());
    setChecks(null);
  }

  function toggleRow(index: number) {
    setToggled((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const selectedCount = checks
    ? rows.filter((_, index) => isRowSelected(index, checks[index], toggled))
        .length
    : 0;
  const needsCurrency =
    (missingCurrency > 0 && !currency) ||
    unknownCurrencies.some((raw) => !currencyMap[raw]);
  const canSubmit = Boolean(
    source.trim() &&
    checks &&
    selectedCount > 0 &&
    !needsCurrency &&
    readingsChosen(conflicts, choices),
  );

  function submit() {
    if (!checks || !recipe) return;
    const toImport = rows.flatMap((row, index) => {
      const check = checks[index];
      const resolved = rowCurrency(row, currency, currencyMap);
      if (!isRowSelected(index, check, toggled) || !resolved) return [];
      return [
        {
          sheet: row.sheet,
          row: row.row,
          csv: toCsvRow(row, resolved, check.externalId),
        },
      ];
    });
    const skippedLogs = rows.flatMap((row, index) =>
      checks[index] && !isRowSelected(index, checks[index], toggled)
        ? [skippedRowLog(row, checks[index])]
        : [],
    );
    startTransition(async () => {
      const started = await startSheetImport({ source, fileName });
      if (!started.ok) {
        toast.error(started.error);
        return;
      }
      const importId = started.data!.importId;
      let imported = 0;
      for (const chunk of inChunks(toImport)) {
        const result = await importSheetChunk({ importId, rows: chunk });
        if (!result.ok) {
          toast.error(
            imported > 0
              ? `${result.error} (${imported} already imported)`
              : result.error,
          );
          router.refresh();
          return;
        }
        imported += result.data!.imported;
      }
      const finished = await finishSheetImport({
        importId,
        rows: [...skippedLogs, ...notRead.map(notReadLog)],
        layouts: layoutsToSave(recipe, layoutKeys),
      });
      if (!finished.ok) toast.error(finished.error);
      toast.success(
        `Imported ${imported}` +
          (skippedLogs.length > 0
            ? `, ${skippedLogs.length} already in your records`
            : ""),
      );
      reset();
      router.refresh();
    });
  }

  return {
    inputRef,
    pending,
    mode,
    pasted,
    phase,
    error,
    fileName,
    presetFile,
    warnings,
    recipe,
    grids,
    applied,
    rows,
    source,
    currency,
    currencyMap,
    missingCurrency,
    unknownCurrencies,
    notRead,
    toggled,
    checks,
    checkError,
    selectedCount,
    canSubmit,
    setMode,
    setPasted,
    showCorrections,
    setShowCorrections,
    conflicts,
    choices,
    chooseReading,
    changeSource,
    changeCurrency,
    mapCurrency,
    handleFile,
    handlePaste,
    updateTable,
    toggleRow,
    retryCheck,
    reset,
    submit,
  };
}
