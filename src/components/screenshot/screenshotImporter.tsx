"use client";

import { useRef } from "react";
import { ImageUpIcon, Loader2Icon } from "lucide-react";

import { useScreenshotImport } from "@/hooks/useScreenshotImport";
import type { CandidateMatch } from "@/hooks/useScreenshotImport";
import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import type { ImageImportMode } from "@/lib/imageExtract";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { DetectedItemCard } from "./detectedItemCard";

interface Props {
  initialItems: DetectedTransaction[] | null;
  initialIgnored: number;
  initialCandidates: Record<number, CandidateMatch[]>;
  existingSources?: string[];
  mode?: ImageImportMode;
  onDone?: () => void;
  consumeShareCookie?: boolean;
}

export function ScreenshotImporter({
  initialItems,
  initialIgnored,
  initialCandidates,
  existingSources = [],
  mode = "screenshot",
  onDone,
  consumeShareCookie = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    items,
    ignored,
    candidatesByIndex,
    sourceOptions,
    extracting,
    pending,
    canSubmit,
    selectedCount,
    processFile,
    updateItem,
    moveItem,
    removeItem,
    submit,
    reset,
  } = useScreenshotImport({
    initialItems,
    initialIgnored,
    initialCandidates,
    existingSources,
    mode,
    onDone,
    consumeShareCookie,
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = "";
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="screenshot-file"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openPicker} disabled={extracting}>
              {extracting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <ImageUpIcon />
              )}
              {mode === "receipt"
                ? items.length > 0
                  ? "Use another photo"
                  : "Upload receipt photo"
                : items.length > 0
                  ? "Use another screenshot"
                  : "Upload screenshot"}
            </Button>
            {items.length > 0 && (
              <Button
                variant="ghost"
                onClick={reset}
                disabled={extracting || pending}
              >
                Clear
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {mode === "receipt"
              ? "PNG / JPEG / WebP. Take the photo straight on, with the total readable."
              : "PNG / JPEG / WebP. On Android with the app installed, share any screenshot to Money Tracker from the share sheet: same flow."}
          </p>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          {ignored > 0 && (
            <p className="text-muted-foreground text-xs">
              {ignored} non-financial notification(s) skipped.
            </p>
          )}

          <ul className="grid gap-3">
            {items.map((item, index) => (
              <DetectedItemCard
                key={item.id}
                index={index}
                item={item}
                candidates={candidatesByIndex[index] ?? []}
                sourceOptions={sourceOptions}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onChange={(patch) => updateItem(index, patch)}
                onMove={(delta) => moveItem(index, delta)}
                onRemove={() => removeItem(index)}
              />
            ))}
          </ul>

          <div className="bg-card sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-muted-foreground text-sm">
              {selectedCount}/{items.length} selected
            </p>
            <div className="flex items-center gap-2">
              {onDone && (
                <Button variant="ghost" onClick={onDone} disabled={pending}>
                  Cancel
                </Button>
              )}
              <Button onClick={submit} disabled={!canSubmit || pending}>
                {pending && <Loader2Icon className="animate-spin" />}
                Import {selectedCount}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
