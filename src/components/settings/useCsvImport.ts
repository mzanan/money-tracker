"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";

import {
  getLastImportDate,
  importCsvRows,
  type CsvRow,
} from "@/lib/actions/csvImport";
import { kindOfSource } from "@/lib/constants/sources";
import { detectMapping } from "@/lib/csv/detect";
import {
  normalizeRow,
  normalizeRowDetailed,
} from "@/lib/csv/normalize";
import { addOneDay } from "@/lib/csv/parsing";
import {
  CSV_PRESETS,
  CSV_PRESET_BY_ID,
  type CsvMapping,
} from "@/lib/csv/presets";

type Mode = "file" | "paste";

const LAST_FORMAT_KEY = "csv:lastFormat";

function rememberedFormat(current: string): string {
  if (current !== "custom") return current;
  if (typeof window === "undefined") return current;
  const stored = localStorage.getItem(LAST_FORMAT_KEY);
  return stored && CSV_PRESET_BY_ID[stored] ? stored : current;
}

const EMPTY_MAPPING: CsvMapping = {
  dateCol: "",
  dateFormat: "iso",
  amountCol: "",
  currencyMode: "fixed",
  currencyCol: "",
  currencyFixed: "USD",
  descriptionCol: "",
  signConvention: "signed-amount",
  debitCol: "",
  creditCol: "",
  directionCol: "",
  statusCol: "",
  externalIdCol: "",
  sinceDate: "",
};

export function useCsvImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>("file");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>(EMPTY_MAPPING);
  const [source, setSource] = useState("");
  const [formatId, setFormatId] = useState<string>("custom");
  const [pasted, setPasted] = useState("");
  const [replace, setReplace] = useState(false);

  function buildMapping(
    fields: string[],
    rows: Record<string, string>[],
    presetId: string,
  ): { mapping: CsvMapping; presetSource: string | null } {
    const auto = detectMapping(fields, rows);
    const preset = CSV_PRESET_BY_ID[presetId];
    if (!preset) return { mapping: auto, presetSource: null };
    return {
      mapping: { ...auto, ...preset.mapping },
      presetSource: preset.source,
    };
  }

  function reset() {
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping(EMPTY_MAPPING);
    setSource("");
    setFormatId("custom");
    setPasted("");
    setReplace(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function applyCutoff(presetSource: string) {
    const result = await getLastImportDate(presetSource);
    if (result.ok && result.data?.date) {
      const next = addOneDay(result.data.date);
      setMapping((m) => ({ ...m, sinceDate: next }));
    }
  }

  function ingestParseResult(
    result: Papa.ParseResult<Record<string, string>>,
    label: string,
    sourceGuess: string,
  ) {
    if (result.errors.length > 0 && !result.data.length) {
      toast.error("Could not parse CSV");
      return;
    }
    const fields = result.meta.fields ?? [];
    const effectiveFormat = rememberedFormat(formatId);
    const { mapping: nextMapping, presetSource } = buildMapping(
      fields,
      result.data,
      effectiveFormat,
    );
    setFormatId(effectiveFormat);
    setFileName(label);
    setHeaders(fields);
    setRawRows(result.data);
    setSource(presetSource ?? sourceGuess);
    setMapping(nextMapping);
    if (presetSource) void applyCutoff(presetSource);
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) =>
        ingestParseResult(
          result,
          file.name,
          file.name.replace(/\.[^.]+$/, "").toLowerCase(),
        ),
      error: () => toast.error("Could not read file"),
    });
  }

  function handlePaste() {
    const text = pasted.trim();
    if (!text) {
      toast.error("Paste something first");
      return;
    }
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    ingestParseResult(result, "Pasted CSV", "");
  }

  async function handleFormatChange(nextId: string) {
    setFormatId(nextId);
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_FORMAT_KEY, nextId);
    }
    const { mapping: nextMapping, presetSource } =
      headers.length > 0
        ? buildMapping(headers, rawRows, nextId)
        : {
            mapping: null,
            presetSource: CSV_PRESET_BY_ID[nextId]?.source ?? null,
          };
    if (nextMapping) setMapping(nextMapping);
    if (!presetSource) return;

    setSource(presetSource);
    await applyCutoff(presetSource);
  }

  const previewRows = useMemo(() => {
    if (!rawRows.length || !mapping.dateCol) return [];
    const out: { raw: Record<string, string>; normalized: CsvRow }[] = [];
    for (const row of rawRows) {
      const normalized = normalizeRow(row, mapping);
      if (normalized) out.push({ raw: row, normalized });
      if (out.length >= 10) break;
    }
    return out;
  }, [rawRows, mapping]);

  const totalNormalized = useMemo(() => {
    if (!rawRows.length || !mapping.dateCol)
      return { ok: 0, bad: 0, cutoff: 0 };
    let ok = 0;
    let bad = 0;
    let cutoff = 0;
    for (const row of rawRows) {
      const result = normalizeRowDetailed(row, mapping);
      if (result.ok) ok += 1;
      else if (result.cutoff) cutoff += 1;
      else bad += 1;
    }
    return { ok, bad, cutoff };
  }, [rawRows, mapping]);

  const normalizedSource = source.trim().toLowerCase();
  const sourceReserved =
    normalizedSource === "manual" || kindOfSource(normalizedSource) === "api";

  const canSubmit = Boolean(
    source.trim() &&
      !sourceReserved &&
      mapping.dateCol &&
      (mapping.signConvention === "debit-credit-cols"
        ? mapping.debitCol && mapping.creditCol
        : mapping.signConvention === "direction-column"
          ? mapping.amountCol && mapping.directionCol
          : mapping.amountCol) &&
      (mapping.currencyMode === "fixed"
        ? mapping.currencyFixed
        : mapping.currencyCol) &&
      totalNormalized.ok > 0,
  );

  function submit() {
    const normalized = rawRows
      .map((row) => normalizeRow(row, mapping))
      .filter((row): row is CsvRow => row !== null);

    if (
      replace &&
      !window.confirm(
        `Replace all existing transactions in source "${source}" with this CSV?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await importCsvRows({ source, rows: normalized, replace });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { imported, skipped, errors } = result.data!;
      toast.success(
        `${replace ? "Replaced with " : "Imported "}${imported}` +
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
    fileName,
    headers,
    rawRows,
    mapping,
    source,
    formatId,
    pasted,
    replace,
    previewRows,
    totalNormalized,
    canSubmit,
    presets: CSV_PRESETS,
    setMode,
    setPasted,
    setSource,
    setMapping,
    setReplace,
    handleFile,
    handlePaste,
    handleFormatChange,
    reset,
    submit,
  };
}
