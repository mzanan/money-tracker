import { db } from "@/lib/db";
import { crypto_assets } from "@/lib/db/schema";
import { scaleResolver, type ScaleOf } from "@/lib/ledger/scale";

export async function getScaleOf(): Promise<ScaleOf> {
  const rows = await db
    .select({ code: crypto_assets.code, scale: crypto_assets.scale })
    .from(crypto_assets);
  return scaleResolver(rows);
}
