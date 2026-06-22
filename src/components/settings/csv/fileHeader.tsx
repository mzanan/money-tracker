"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FileHeader({
  fileName,
  rowCount,
  pending,
  onReset,
}: {
  fileName: string;
  rowCount: number;
  pending: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-muted-foreground text-xs">{rowCount} rows detected</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={onReset}
        disabled={pending}
      >
        <XIcon className="size-4" />
        Start over
      </Button>
    </div>
  );
}
