"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import {
  importScreenshotRows,
  previewCandidatesAction,
} from "@/lib/actions/screenshotImport";

export interface EditableItem {
  selected: boolean;
  kind: "income" | "expense";
  amount: string;
  currency: string;
  occurredOn: string | null;
  description: string;
  app: string | null;
  comment: string;
  confidence: "high" | "medium" | "low";
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

function detectedToEditable(detected: DetectedTransaction): EditableItem {
  return {
    selected: true,
    kind: detected.kind,
    amount: detected.amount.toString(),
    currency: detected.currency.toUpperCase(),
    occurredOn: detected.occurredOn,
    description: detected.description ?? "",
    app: detected.app,
    comment: "",
    confidence: detected.confidence,
  };
}

export function useScreenshotImport({
  initialItems,
  initialIgnored,
  initialCandidates,
  onDone,
}: {
  initialItems: DetectedTransaction[] | null;
  initialIgnored: number;
  initialCandidates: Record<number, CandidateMatch[]>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [extracting, startExtract] = useTransition();
  const [pending, startCommit] = useTransition();

  const [items, setItems] = useState<EditableItem[]>(
    initialItems?.map(detectedToEditable) ?? [],
  );
  const [ignored, setIgnored] = useState(initialIgnored);
  const [candidatesByIndex, setCandidatesByIndex] =
    useState<Record<number, CandidateMatch[]>>(initialCandidates);

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
    const form = new FormData();
    form.append("image", file);

    startExtract(async () => {
      try {
        const response = await fetch("/api/screenshot/extract", {
          method: "POST",
          body: form,
        });
        const payload = (await response.json()) as
          | { items?: DetectedTransaction[]; ignored?: number }
          | { error: string };

        if (!response.ok) {
          toast.error(
            "error" in payload
              ? `Could not read: ${payload.error}`
              : "Could not read screenshot",
          );
          return;
        }

        const detected = "items" in payload ? (payload.items ?? []) : [];
        const editable = detected.map(detectedToEditable);
        setItems(editable);
        setIgnored("ignored" in payload ? (payload.ignored ?? 0) : 0);
        setCandidatesByIndex({});
        if (editable.length === 0) {
          toast.info("No financial notifications found in that screenshot.");
        } else {
          void refreshCandidates(editable);
        }
      } catch {
        toast.error("Network error while reading screenshot");
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
        item.currency.trim().length >= 3 && parseFloat(item.amount) > 0,
    );

  function submit() {
    const rows = selectedItems.map((item) => ({
      kind: item.kind,
      amount: parseFloat(item.amount),
      currency: item.currency.trim().toUpperCase(),
      occurredOn: item.occurredOn,
      description: item.description.trim() || null,
      app: item.app,
      comment: item.comment.trim() || null,
    }));

    startCommit(async () => {
      const result = await importScreenshotRows({ rows });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { imported, errors } = result.data!;
      toast.success(
        `Imported ${imported}${errors > 0 ? `, ${errors} errors` : ""}`,
      );
      reset();
      router.refresh();
      if (onDone) onDone();
      else router.push("/");
    });
  }

  return {
    items,
    ignored,
    candidatesByIndex,
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
