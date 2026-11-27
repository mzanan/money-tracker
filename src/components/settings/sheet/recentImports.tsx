"use client";

import { Undo2Icon } from "lucide-react";

import type { SheetImportSummary } from "@/lib/data/sheetImports";
import { importSummaryMeta } from "@/lib/sheetImport/importSummary";

import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/listRow";
import { Surface } from "@/components/ui/surface";

import { useRecentImports } from "./useRecentImports";

export function RecentImports({ imports }: { imports: SheetImportSummary[] }) {
  const recent = useRecentImports();
  if (!imports.length) return null;
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium">Recent imports</p>
      <ul className="grid gap-1">
        {imports.map((item) => (
          <Surface asChild tone="outline" padding="row" key={item.id}>
            <li>
              <ListRow title={item.fileName} meta={importSummaryMeta(item)}>
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
              </ListRow>
            </li>
          </Surface>
        ))}
      </ul>
    </div>
  );
}
