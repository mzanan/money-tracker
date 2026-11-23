import { transactionContentHash } from "@/lib/transactions";

export interface FingerprintInput {
  occurredOn: string;
  amount: number;
  currency: string;
  description: string | null;
  kind: "expense" | "income";
}

export const SHEET_ID_PREFIX = "sheet-";

export function sheetFingerprints(
  rows: ReadonlyArray<FingerprintInput>,
): string[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const hash = transactionContentHash(row).slice(0, 32);
    const occurrence = (seen.get(hash) ?? 0) + 1;
    seen.set(hash, occurrence);
    return `${SHEET_ID_PREFIX}${hash}-${occurrence}`;
  });
}
