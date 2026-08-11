"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, ReceiptTextIcon, SmartphoneIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/iconCircle";
import type { ImageImportMode } from "@/lib/imageExtract";

function messageFor(mode: ImageImportMode, elapsedMs: number): string {
  const subject = mode === "receipt" ? "receipt" : "screenshot";
  if (elapsedMs < 4000) return `Reading your ${subject}…`;
  if (elapsedMs < 12000)
    return "Still reading. Free-tier AI, this can take a bit.";
  return "Sorry, this is embarrassingly slow. Free-tier AI at work, hang on or cancel and add it manually.";
}

export function ImageExtractLoading({
  mode,
  onCancel,
}: {
  mode: ImageImportMode;
  onCancel: () => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const interval = setInterval(() => {
      setElapsedMs(performance.now() - start);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const Icon = mode === "receipt" ? ReceiptTextIcon : SmartphoneIcon;

  return (
    <div className="grid justify-items-center gap-4 py-6 text-center">
      <IconCircle className="bg-surface-2 text-foreground relative size-12">
        <Icon className="size-5" />
        <Loader2Icon className="text-muted-foreground absolute -inset-1 size-14 animate-spin" />
      </IconCircle>
      <p
        key={messageFor(mode, elapsedMs)}
        className="text-muted-foreground max-w-xs text-sm transition-opacity duration-300 motion-reduce:transition-none"
      >
        {messageFor(mode, elapsedMs)}
      </p>
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
