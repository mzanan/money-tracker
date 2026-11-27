import Papa from "papaparse";

import { detectMapping } from "@/lib/csv/detect";
import { addOneDay } from "@/lib/csv/parsing";
import { CSV_PRESET_BY_ID, type CsvMapping } from "@/lib/csv/presets";

export interface CsvInitialFile {
  name: string;
  text: string;
  presetId: string;
  lastImportDate: string | null;
}

export interface CsvInitialState {
  fileName: string;
  headers: string[];
  rawRows: Record<string, string>[];
  mapping: CsvMapping;
  source: string;
  formatId: string;
}

export function initialCsvState(file: CsvInitialFile): CsvInitialState {
  const result = Papa.parse<Record<string, string>>(file.text, {
    header: true,
    skipEmptyLines: true,
  });
  const headers = result.meta.fields ?? [];
  const preset = CSV_PRESET_BY_ID[file.presetId];
  return {
    fileName: file.name,
    headers,
    rawRows: result.data,
    mapping: {
      ...detectMapping(headers, result.data),
      ...preset?.mapping,
      sinceDate: file.lastImportDate ? addOneDay(file.lastImportDate) : "",
    },
    source: preset?.source ?? "",
    formatId: preset ? file.presetId : "custom",
  };
}
