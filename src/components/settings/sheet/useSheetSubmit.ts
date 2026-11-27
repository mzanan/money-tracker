"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  finishSheetImport,
  importSheetChunk,
  startSheetImport,
} from "@/lib/actions/sheetImportLog";
import { chunk } from "@/lib/arrays";
import { SHEET_REQUEST_ROWS } from "@/lib/constants/sheetImport";
import type { SheetRowIssue } from "@/lib/sheetImport/apply";
import type { CurrencyMap } from "@/lib/sheetImport/currency";
import {
  buildImportPlan,
  importSuccessText,
  partialImportText,
} from "@/lib/sheetImport/importPlan";
import { layoutsToSave } from "@/lib/sheetImport/layout";
import type { SheetRowCheck } from "@/lib/sheetImport/check";
import { notReadLog } from "@/lib/sheetImport/log";
import type { SheetRecipe } from "@/lib/sheetImport/recipe";
import type { ReviewRow } from "@/lib/sheetImport/review";

export function useSheetSubmit({
  rows,
  checks,
  recipe,
  toggled,
  currency,
  currencyMap,
  source,
  fileName,
  notRead,
  layoutKeys,
  onDone,
}: {
  rows: ReviewRow[];
  checks: SheetRowCheck[] | null;
  recipe: SheetRecipe | null;
  toggled: ReadonlySet<number>;
  currency: string;
  currencyMap: CurrencyMap;
  source: string;
  fileName: string;
  notRead: SheetRowIssue[];
  layoutKeys: (string | null)[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!checks || !recipe) return;
    const { toImport, skippedLogs } = buildImportPlan(
      rows,
      checks,
      toggled,
      currency,
      currencyMap,
    );
    startTransition(async () => {
      const started = await startSheetImport({ source, fileName });
      if (!started.ok) {
        toast.error(started.error);
        return;
      }
      const importId = started.data!.importId;
      let imported = 0;
      for (const part of chunk(toImport, SHEET_REQUEST_ROWS)) {
        const result = await importSheetChunk({ importId, rows: part });
        if (!result.ok) {
          toast.error(partialImportText(result.error, imported));
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
      toast.success(importSuccessText(imported, skippedLogs.length));
      onDone();
      router.refresh();
    });
  }

  return { pending, submit };
}
