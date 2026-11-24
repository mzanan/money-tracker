import { createHash } from "node:crypto";

import { fingerprintOccurrences } from "@/lib/sheetImport/occurrence";

export const SHEET_ID_PREFIX = "sheet-";

export function sheetFingerprint(key: string, occurrence: number): string {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 32);
  return `${SHEET_ID_PREFIX}${hash}-${occurrence}`;
}

export function sheetFingerprints(
  rows: ReadonlyArray<{ fingerprintKey: string }>,
): string[] {
  const occurrences = fingerprintOccurrences(rows);
  return rows.map(({ fingerprintKey }, i) =>
    sheetFingerprint(fingerprintKey, occurrences[i]),
  );
}
