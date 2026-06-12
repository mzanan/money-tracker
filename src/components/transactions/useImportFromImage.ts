"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { CandidateMatch } from "@/hooks/useScreenshotImport";
import { previewCandidatesAction } from "@/lib/actions/screenshotImport";
import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import {
  requestImageExtraction,
  type ImageImportMode,
} from "@/lib/imageExtract";

export interface ImageImportPayload {
  mode: ImageImportMode;
  items: DetectedTransaction[];
  ignored: number;
  candidates: Record<number, CandidateMatch[]>;
}

async function loadCandidatesFor(
  items: DetectedTransaction[],
): Promise<Record<number, CandidateMatch[]>> {
  if (items.length === 0) return {};
  const queries = items.map((item) => ({
    occurredOn: item.occurredOn,
    amount: item.amount,
    currency: item.currency.toUpperCase(),
    kind: item.kind,
  }));
  const result = await previewCandidatesAction(queries);
  if (!result.ok || !result.data) return {};
  const map: Record<number, CandidateMatch[]> = {};
  for (const entry of result.data.candidates) {
    if (entry.matches.length > 0) map[entry.index] = entry.matches;
  }
  return map;
}

export function useImportFromImage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<ImageImportMode>("screenshot");
  const [menuOpen, setMenuOpen] = useState(false);
  const [payload, setPayload] = useState<ImageImportPayload | null>(null);
  const [extracting, startExtract] = useTransition();

  function pickMode(mode: ImageImportMode) {
    modeRef.current = mode;
    setMenuOpen(false);
    const input = fileInputRef.current;
    if (!input) return;
    if (mode === "receipt") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const mode = modeRef.current;

    startExtract(async () => {
      const extract = await requestImageExtraction(file, mode);
      if (!extract.ok) {
        toast.error(extract.error);
        return;
      }
      if (extract.items.length === 0) {
        toast.info(
          mode === "receipt"
            ? "No readable purchase found in that photo."
            : extract.ignored > 0
              ? `${extract.ignored} non-financial notification(s) skipped.`
              : "No financial notifications found in that screenshot.",
        );
        return;
      }
      const candidates = await loadCandidatesFor(extract.items);
      setPayload({
        mode,
        items: extract.items,
        ignored: extract.ignored,
        candidates,
      });
    });
  }

  return {
    fileInputRef,
    menuOpen,
    setMenuOpen,
    payload,
    setPayload,
    extracting,
    pickMode,
    handleFileChange,
  };
}
