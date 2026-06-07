"use client";

import { useRef } from "react";
import { ImageUpIcon, Loader2Icon } from "lucide-react";

import { useScreenshotImport } from "@/hooks/useScreenshotImport";
import type { CandidateMatch } from "@/hooks/useScreenshotImport";
import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { DetectedItemCard } from "./detectedItemCard";

interface Props {
  initialItems: DetectedTransaction[] | null;
  initialIgnored: number;
  initialCandidates: Record<number, CandidateMatch[]>;
}

export function ScreenshotImporter({
  initialItems,
  initialIgnored,
  initialCandidates,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    items,
    ignored,
    candidatesByIndex,
    extracting,
    pending,
    canSubmit,
    selectedCount,
    processFile,
    updateItem,
    removeItem,
    submit,
    reset,
  } = useScreenshotImport({ initialItems, initialIgnored, initialCandidates });

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
              {items.length > 0
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
            PNG / JPEG / WebP. On Android with the app installed, share any
            screenshot to Money Tracker from the share sheet — same flow.
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
                key={index}
                index={index}
                item={item}
                candidates={candidatesByIndex[index] ?? []}
                onChange={(patch) => updateItem(index, patch)}
                onRemove={() => removeItem(index)}
              />
            ))}
          </ul>

          <div className="bg-card sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-muted-foreground text-sm">
              {selectedCount}/{items.length} selected
            </p>
            <Button onClick={submit} disabled={!canSubmit || pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              Import {selectedCount}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
