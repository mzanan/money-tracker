"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import {
  clearSharePayload,
  importScreenshotRows,
  previewCandidatesAction,
  type ScreenshotRowStatus,
} from "@/lib/actions/screenshotImport";
import {
  requestImageExtraction,
  type ImageImportMode,
} from "@/lib/imageExtract";
import { SOURCE_LABELS, sourceForApp } from "@/lib/constants/sources";

export interface EditableItem {
  id: string;
  selected: boolean;
  kind: "income" | "expense";
  amount: string;
  currency: string;
  occurredOn: string | null;
  description: string;
  category: string | null;
  app: string | null;
  source: string;
  confidence: "high" | "medium" | "low";
  replaceId: string | null;
  error: string | null;
}

const ROW_ERRORS: Record<Exclude<ScreenshotRowStatus, "imported">, string> = {
  duplicate: "Already imported before (duplicate).",
  invalid_currency: "Currency not supported and no exchange rate for it.",
  invalid_amount: "Amount must be a positive number.",
  invalid_date: "Date must be YYYY-MM-DD.",
  invalid_source:
    "Source must be letters, numbers, spaces or dashes (max 32).",
  failed: "Could not save this row. Try again.",
};

function sourceFor(app: string | null): string {
  const source = sourceForApp(app);
  return source in SOURCE_LABELS ? source : "";
}

export interface CandidateMatch {
  id: string;
  source: string;
  occurredOn: string;
  amount: number;
  currency: string;
  kind: "income" | "expense";
  note: string | null;
}

function detectedToEditable(
  detected: DetectedTransaction,
  mode: ImageImportMode,
): EditableItem {
  return {
    id: crypto.randomUUID(),
    selected: true,
    kind: detected.kind,
    amount: detected.amount.toString(),
    currency: detected.currency.toUpperCase(),
    occurredOn: detected.occurredOn,
    description: detected.description ?? "",
    category: detected.category,
    app: detected.app,
    source: mode === "receipt" ? "" : sourceFor(detected.app),
    confidence: detected.confidence,
    replaceId: null,
    error: null,
  };
}

export function useScreenshotImport({
  initialItems,
  initialIgnored,
  initialCandidates,
  mode = "screenshot",
  onDone,
  consumeShareCookie = false,
}: {
  initialItems: DetectedTransaction[] | null;
  initialIgnored: number;
  initialCandidates: Record<number, CandidateMatch[]>;
  mode?: ImageImportMode;
  onDone?: () => void;
  consumeShareCookie?: boolean;
}) {
  const router = useRouter();
  const [extracting, startExtract] = useTransition();
  const [pending, startCommit] = useTransition();

  useEffect(() => {
    if (consumeShareCookie) void clearSharePayload();
  }, [consumeShareCookie]);

  const [items, setItems] = useState<EditableItem[]>(
    initialItems?.map((detected) => detectedToEditable(detected, mode)) ?? [],
  );
  const [ignored, setIgnored] = useState(initialIgnored);
  const [candidatesByIndex, setCandidatesByIndex] =
    useState<Record<number, CandidateMatch[]>>(initialCandidates);

  const customSources = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.source.trim().toLowerCase())
            .filter((source) => source && !(source in SOURCE_LABELS)),
        ),
      ),
    [items],
  );

  const refreshCandidates = useCallback(async (current: EditableItem[]) => {
    if (current.length === 0) {
      setCandidatesByIndex({});
      return;
    }
    const queries = current.map((item) => ({
      occurredOn: item.occurredOn,
      amount: parseFloat(item.amount) || 0,
      currency: item.currency,
      kind: item.kind,
    }));
    const result = await previewCandidatesAction(queries);
    if (!result.ok) return;
    const map: Record<number, CandidateMatch[]> = {};
    for (const entry of result.data!.candidates) {
      if (entry.matches.length > 0) map[entry.index] = entry.matches;
    }
    setCandidatesByIndex(map);
  }, []);

  function processFile(file: File) {
    startExtract(async () => {
      const extract = await requestImageExtraction(file, mode);
      if (!extract.ok) {
        toast.error(extract.error);
        return;
      }

      const editable = extract.items.map((detected) =>
        detectedToEditable(detected, mode),
      );
      setItems(editable);
      setIgnored(extract.ignored);
      setCandidatesByIndex({});
      if (editable.length === 0) {
        toast.info(
          mode === "receipt"
            ? "No readable purchase found in that photo."
            : "No financial notifications found in that screenshot.",
        );
      } else {
        void refreshCandidates(editable);
      }
    });
  }

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setCandidatesByIndex((prev) => {
      const next: Record<number, CandidateMatch[]> = {};
      for (const [key, val] of Object.entries(prev)) {
        const num = Number(key);
        if (num < index) next[num] = val;
        else if (num > index) next[num - 1] = val;
      }
      return next;
    });
  }

  function reset() {
    setItems([]);
    setCandidatesByIndex({});
    setIgnored(0);
  }

  const selectedItems = items.filter((item) => item.selected);
  const canSubmit =
    selectedItems.length > 0 &&
    selectedItems.every(
      (item) =>
        item.currency.trim().length >= 3 &&
        parseFloat(item.amount) > 0 &&
        item.source.trim().length > 0,
    );

  function submit() {
    const rows = selectedItems.map((item) => ({
      id: item.id,
      kind: item.kind,
      amount: parseFloat(item.amount),
      currency: item.currency.trim().toUpperCase(),
      occurredOn: item.occurredOn,
      description: item.description.trim() || null,
      category: item.category,
      source: item.source,
      replaceId: item.replaceId,
    }));

    startCommit(async () => {
      const result = await importScreenshotRows({ rows });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { imported, results } = result.data!;
      const failedById = new Map(
        results
          .filter((r) => r.status !== "imported")
          .map((r) => [r.id, ROW_ERRORS[r.status as keyof typeof ROW_ERRORS]]),
      );

      if (failedById.size === 0) {
        toast.success(`Imported ${imported}`);
        reset();
        router.refresh();
        if (onDone) onDone();
        else router.push("/");
        return;
      }

      if (imported > 0) {
        toast.success(`Imported ${imported}`);
        router.refresh();
      }
      toast.error(
        `${failedById.size} item(s) not imported. Check the reasons below.`,
      );
      setItems((prev) =>
        prev
          .filter((item) => !item.selected || failedById.has(item.id))
          .map((item) => ({
            ...item,
            error: failedById.get(item.id) ?? item.error,
          })),
      );
      setCandidatesByIndex({});
    });
  }

  return {
    items,
    ignored,
    candidatesByIndex,
    customSources,
    extracting,
    pending,
    canSubmit,
    selectedCount: selectedItems.length,
    processFile,
    updateItem,
    removeItem,
    submit,
    reset,
  };
}
