import { CRYPTO_CODES } from "@/lib/constants/currencies";
import { db } from "@/lib/db";
import { crypto_assets } from "@/lib/db/schema";
import { scaleResolver, type ScaleOf } from "@/lib/ledger/scale";

let cachedScaleOf: Promise<ScaleOf> | null = null;

async function loadScaleOf(): Promise<ScaleOf> {
  const rows = await db
    .select({ code: crypto_assets.code, scale: crypto_assets.scale })
    .from(crypto_assets);
  const stored = new Set(rows.map((row) => row.code));
  if (CRYPTO_CODES.some((code) => !stored.has(code))) cachedScaleOf = null;
  return scaleResolver(rows);
}

export function getScaleOf(): Promise<ScaleOf> {
  cachedScaleOf ??= loadScaleOf().catch((error: unknown) => {
    cachedScaleOf = null;
    throw error;
  });
  return cachedScaleOf;
}
