import { createHash } from "node:crypto";

export const SHEET_ID_PREFIX = "sheet-";

export function sheetFingerprints(
  rows: ReadonlyArray<{ fingerprintKey: string }>,
): string[] {
  const seen = new Map<string, number>();
  return rows.map(({ fingerprintKey }) => {
    const hash = createHash("sha256")
      .update(fingerprintKey)
      .digest("hex")
      .slice(0, 32);
    const occurrence = (seen.get(hash) ?? 0) + 1;
    seen.set(hash, occurrence);
    return `${SHEET_ID_PREFIX}${hash}-${occurrence}`;
  });
}
