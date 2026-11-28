"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useConfirm } from "@/components/providers/confirmProvider";
import { undoSheetImportAction } from "@/lib/actions/sheetImportLog";
import type { SheetImportSummary } from "@/lib/data/sheetImports";

export function useRecentImports() {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  async function undo(item: SheetImportSummary) {
    const confirmed = await confirm(
      `Undo the import of ${item.fileName}? This deletes the ${item.importedCount} transactions it added to ${item.source}.`,
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await undoSheetImportAction(item.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Removed ${result.data!.removed} transactions`);
      router.refresh();
    });
  }

  return { pending, undo };
}
