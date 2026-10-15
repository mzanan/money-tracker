import { db } from "@/lib/db";
import { crypto_assets } from "@/lib/db/schema";
import { scaleResolver, type ScaleOf } from "@/lib/ledger/scale";

let cachedScaleOf: Promise<ScaleOf> | null = null;

async function loadScaleOf(): Promise<ScaleOf> {
  const rows = await db
    .select({ code: crypto_assets.code, scale: crypto_assets.scale })
    .from(crypto_assets);
  return scaleResolver(rows);
}

export function getScaleOf(): Promise<ScaleOf> {
  cachedScaleOf ??= loadScaleOf().catch((error: unknown) => {
    cachedScaleOf = null;
    throw error;
  });
  return cachedScaleOf;
}
