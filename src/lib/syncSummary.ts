export interface SyncCounts {
  imported: number;
  skipped: number;
  absorbed: number;
}

export function syncSummary(label: string, counts?: SyncCounts): string {
  const imported = counts?.imported ?? 0;
  const skipped = counts?.skipped ?? 0;
  const absorbed = counts?.absorbed ?? 0;
  return (
    `${label}: imported ${imported}` +
    (skipped > 0 ? `, ${skipped} skipped` : "") +
    (absorbed > 0 ? `, ${absorbed} merged from manual` : "")
  );
}
