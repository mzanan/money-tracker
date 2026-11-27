"use client";

import { Undo2Icon } from "lucide-react";

import type { SheetImportSummary } from "@/lib/data/sheetImports";
import { formatDateShort } from "@/lib/dates";

import { Button } from "@/components/ui/button";

import { useRecentImports } from "./useRecentImports";

export function RecentImports({ imports }: { imports: SheetImportSummary[] }) {
  const recent = useRecentImports();
  if (!imports.length) return null;
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium">Recent imports</p>
      <ul className="grid gap-1">
        {imports.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{item.fileName}</p>
              <p className="text-muted-foreground text-caption">
                {formatDateShort(item.createdAt.slice(0, 10))} · {item.source} ·{" "}
                {item.importedCount} imported · {item.skippedCount} already in
                your records · {item.notReadCount} not read
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              disabled={recent.pending || item.importedCount === 0}
              onClick={() => recent.undo(item)}
            >
              <Undo2Icon className="size-4" />
              Undo
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
