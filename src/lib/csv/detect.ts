import {
  EXPENSE_DIRECTIONS,
  INCOME_DIRECTIONS,
  PATTERNS,
} from "@/lib/csv/constants";
import { parseAmount } from "@/lib/csv/parsing";
import type {
  CsvMapping,
  DateFormat,
  SignConvention,
} from "@/lib/csvPresets";

export function matchesAny(header: string, patterns: readonly RegExp[]): boolean {
  const lower = header.toLowerCase();
  return patterns.some((p) => p.test(lower));
}

function scoreHeader(
  header: string,
  include: readonly RegExp[],
  exclude: readonly RegExp[] = [],
): number {
  const lower = header.toLowerCase();
  let bestIncludePos = -1;
  for (const p of include) {
    const m = lower.match(p);
    if (m && m.index !== undefined) {
      if (bestIncludePos === -1 || m.index < bestIncludePos) {
        bestIncludePos = m.index;
      }
    }
  }
  if (bestIncludePos === -1) return 0;

  for (const p of exclude) {
    const m = lower.match(p);
    if (m && m.index !== undefined && m.index < bestIncludePos) {
      return 0;
    }
  }
  return 1000 - bestIncludePos;
}

function pickByScore(
  headers: string[],
  include: readonly RegExp[],
  exclude: readonly RegExp[] = [],
): string {
  let best = { col: "", score: 0 };
  for (const h of headers) {
    const s = scoreHeader(h, include, exclude);
    if (s > best.score) best = { col: h, score: s };
  }
  return best.col;
}

function countMatches(
  rows: Record<string, string>[],
  col: string,
  test: (v: string) => boolean,
): number {
  return rows.filter((r) => test((r[col] ?? "").trim())).length;
}

export function detectMapping(
  headers: string[],
  rows: Record<string, string>[],
): CsvMapping {
  const sample = rows.slice(0, 20);
  const threshold = Math.max(1, Math.floor(sample.length * 0.5));

  const dateCol =
    pickByScore(headers, PATTERNS.date) ||
    headers.find(
      (h) =>
        countMatches(sample, h, (v) =>
          /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(
            v,
          ),
        ) >= threshold,
    ) ||
    "";

  const debitCol = pickByScore(headers, PATTERNS.debit);
  const creditCol = pickByScore(headers, PATTERNS.credit);

  const numericCandidates = headers.filter(
    (h) =>
      h !== dateCol &&
      !PATTERNS.amountExclude.some((p) => p.test(h.toLowerCase())) &&
      countMatches(sample, h, (v) => parseAmount(v) !== null) >= threshold,
  );

  const amountCol =
    pickByScore(headers, PATTERNS.amount, PATTERNS.amountExclude) ||
    numericCandidates[0] ||
    "";

  const currencyCandidates = headers.filter(
    (h) =>
      !PATTERNS.currencyExclude.some((p) => p.test(h.toLowerCase())) &&
      countMatches(sample, h, (v) => /^[A-Z]{3,4}$/i.test(v)) >= threshold,
  );

  const currencyCol =
    pickByScore(headers, PATTERNS.currency, PATTERNS.currencyExclude) ||
    currencyCandidates[0] ||
    "";

  const fillRate = (col: string) =>
    countMatches(sample, col, (v) => v !== "");

  const descriptionCandidates = headers
    .filter((h) => matchesAny(h, PATTERNS.description))
    .sort((a, b) => fillRate(b) - fillRate(a));
  const descriptionCol = descriptionCandidates[0] ?? "";

  const directionCol = pickByScore(headers, PATTERNS.direction);
  const statusCol = pickByScore(headers, PATTERNS.status);
  const externalIdCol = pickByScore(headers, PATTERNS.externalId);

  let dateFormat: DateFormat = "iso";
  if (dateCol) {
    const values = sample
      .map((r) => (r[dateCol] ?? "").trim())
      .filter(Boolean);
    if (values.some((v) => /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(v))) {
      dateFormat = "iso";
    } else {
      const parts = values.map((v) =>
        v.split(/[-/.\s]/).map((p) => parseInt(p, 10)),
      );
      const firstOver12 = parts.some((p) => Number.isFinite(p[0]) && p[0] > 12);
      const secondOver12 = parts.some(
        (p) => Number.isFinite(p[1]) && p[1] > 12,
      );
      if (firstOver12) dateFormat = "dmy";
      else if (secondOver12) dateFormat = "mdy";
      else dateFormat = "dmy";
    }
  }

  let signConvention: SignConvention = "signed-amount";
  if (directionCol) {
    const directionValues = sample
      .map((r) => (r[directionCol] ?? "").trim().toLowerCase())
      .filter(Boolean);
    const recognized = directionValues.filter(
      (v) => INCOME_DIRECTIONS.has(v) || EXPENSE_DIRECTIONS.has(v),
    );
    if (recognized.length >= Math.max(1, directionValues.length * 0.6)) {
      signConvention = "direction-column";
    }
  }
  if (signConvention !== "direction-column") {
    if (debitCol && creditCol) {
      signConvention = "debit-credit-cols";
    } else if (amountCol) {
      const hasNegatives = sample.some((r) => {
        const v = parseAmount(r[amountCol]);
        return v !== null && v < 0;
      });
      signConvention = hasNegatives ? "signed-amount" : "all-expense";
    }
  }

  const currencyMode: "column" | "fixed" = currencyCol ? "column" : "fixed";

  return {
    dateCol,
    dateFormat,
    amountCol: signConvention === "debit-credit-cols" ? "" : amountCol,
    currencyMode,
    currencyCol: currencyMode === "column" ? currencyCol : "",
    currencyFixed: "USD",
    descriptionCol,
    signConvention,
    debitCol: signConvention === "debit-credit-cols" ? debitCol : "",
    creditCol: signConvention === "debit-credit-cols" ? creditCol : "",
    directionCol: signConvention === "direction-column" ? directionCol : "",
    statusCol,
    externalIdCol,
    sinceDate: "",
  };
}
