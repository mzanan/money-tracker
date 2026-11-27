"use client";

import { useEffect, useState } from "react";

import { checkSheetRows, claimSheetRows } from "@/lib/actions/sheetImport";
import { chunk } from "@/lib/arrays";
import { SHEET_REQUEST_ROWS } from "@/lib/constants/sheetImport";
import type { CurrencyMap } from "@/lib/sheetImport/currency";
import type { SheetRowCheck } from "@/lib/sheetImport/check";
import { checkRowOf, type ReviewRow } from "@/lib/sheetImport/review";

const CHECK_DELAY_MS = 400;
const CHECK_FAILED = "Could not check these rows against your data. Try again.";

export function useSheetChecks({
  rows,
  source,
  currency,
  currencyMap,
}: {
  rows: ReviewRow[];
  source: string;
  currency: string;
  currencyMap: CurrencyMap;
}) {
  const [checkRun, setCheckRun] = useState(0);
  const [checks, setChecks] = useState<SheetRowCheck[] | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!rows.length) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found: SheetRowCheck[] = [];
      const used: string[] = [];
      const chunks = chunk(
        rows.map((row) => checkRowOf(row, currency, currencyMap)),
        SHEET_REQUEST_ROWS,
      );
      try {
        for (const part of chunks) {
          const claimed = await claimSheetRows({ source, rows: part });
          if (cancelled) return;
          if (!claimed.ok) {
            setCheckError(claimed.error);
            return;
          }
          used.push(...(claimed.data?.transactionIds ?? []));
        }
        for (const part of chunks) {
          const result = await checkSheetRows({ source, used, rows: part });
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

  function invalidate() {
    setChecks(null);
  }

  function retry() {
    setCheckError(null);
    setCheckRun((run) => run + 1);
  }

  function reset() {
    setChecks(null);
    setCheckError(null);
  }

  return {
    checks,
    checkError,
    checking: !checks && rows.length > 0,
    invalidate,
    retry,
    reset,
  };
}
