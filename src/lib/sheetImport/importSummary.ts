import { formatDateShort } from "@/lib/dates";
import type { SheetImportSummary } from "@/lib/data/sheetImports";

export function importSummaryMeta(item: SheetImportSummary): string {
  return `${formatDateShort(item.createdAt.slice(0, 10))} · ${item.source} · ${item.importedCount} imported · ${item.skippedCount} already in your records · ${item.notReadCount} not read`;
}
