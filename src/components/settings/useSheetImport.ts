"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getLastImportDate, importCsvRows } from "@/lib/actions/csvImport";
import {
  checkSheetRows,
  readSheetLayout,
  type SheetRowCheck,
} from "@/lib/actions/sheetImport";
import type { CsvInitialFile } from "@/lib/csv/initialImport";
import { presetForCsvText } from "@/lib/csv/presets";
import { applyRecipe } from "@/lib/sheetImport/apply";
import {
  mergeRecipes,
  type SheetRecipe,
  type TableRecipe,
} from "@/lib/sheetImport/recipe";
import {
  inChunks,
  isSkippedRow,
  reviewRows,
  rowCurrency,
  rowsWithoutCurrency,
  skippedCurrencyIssues,
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
  const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set());
  const [checks, setChecks] = useState<SheetRowCheck[] | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [showCorrections, setShowCorrections] = useState(false);

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
      try {
        for (const chunk of inChunks(rows)) {
          const result = await checkSheetRows({
            source,
            rows: chunk.map((row) => ({
              occurredOn: row.occurredOn,
              kind: row.kind,
              amount: row.amount,
              currency: rowCurrency(row, currency, currencyMap),
              description: row.description,
              fingerprintKey: row.fingerprintKey,
              occurrence: row.occurrence,
            })),
          });
          if (cancelled) return;
          if (!result.ok) {
            setCheckError(result.error);
            return;
          }
          found.push(...(result.data?.checks ?? []));
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
  }, [rows, source, currency, currencyMap]);

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
    setExcluded(new Set());
    setChecks(null);
    setCheckError(null);
    setShowCorrections(false);
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
      setGrids(read.sheets);
      setWarnings(read.warnings);
      setRecipe(mergeRecipes(recipes));
      setSource(name.replace(/\.[^.]+$/, "").toLowerCase());
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
    setExcluded(new Set());
    setChecks(null);
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
    setExcluded(new Set());
    setChecks(null);
  }

  function toggleRow(index: number) {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const selected = rows.filter(
    (_, index) => !excluded.has(index) && !checks?.[index]?.alreadyImported,
  );
  const needsCurrency =
    (missingCurrency > 0 && !currency) ||
    unknownCurrencies.some((raw) => !currencyMap[raw]);
  const canSubmit = Boolean(
    source.trim() && checks && selected.length > 0 && !needsCurrency,
  );

  function submit() {
    if (!checks) return;
    const toImport = rows.flatMap((row, index) => {
      const check = checks[index];
      const resolved = rowCurrency(row, currency, currencyMap);
      if (excluded.has(index) || !check || check.alreadyImported || !resolved) {
        return [];
      }
      return [toCsvRow(row, resolved, check.externalId)];
    });
    startTransition(async () => {
      let imported = 0;
      let skipped = 0;
      let errors = 0;
      for (const chunk of inChunks(toImport)) {
        const result = await importCsvRows({ source, rows: chunk });
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
        skipped += result.data!.skipped;
        errors += result.data!.errors;
      }
      toast.success(
        `Imported ${imported}` +
          (skipped > 0 ? `, ${skipped} duplicate` : "") +
          (errors > 0 ? `, ${errors} errors` : ""),
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
    excluded,
    checks,
    checkError,
    selectedCount: selected.length,
    canSubmit,
    setMode,
    setPasted,
    showCorrections,
    setShowCorrections,
    changeSource,
    changeCurrency,
    mapCurrency,
    handleFile,
    handlePaste,
    updateTable,
    toggleRow,
    reset,
    submit,
  };
}
