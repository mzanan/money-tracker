import { and, eq, inArray, sql } from "drizzle-orm";

import { aiCategorizeMerchants } from "@/lib/ai/categorizeMerchants";
import { db } from "@/lib/db";
import { merchant_categories, transactions } from "@/lib/db/schema";

export function merchantKey(note: string | null | undefined): string | null {
  const key = note?.trim().toLowerCase();
  return key && key.length > 1 ? key : null;
}

export async function applyAutoCategories(userId: string): Promise<number> {
  const rows = await db
    .select({ id: transactions.id, note: transactions.note })
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, userId),
        sql`json_array_length(${transactions.tags}) = 0`,
      ),
    );

  const txsByMerchant = new Map<string, string[]>();
  for (const row of rows) {
    const key = merchantKey(row.note);
    if (!key) continue;
    const list = txsByMerchant.get(key);
    if (list) list.push(row.id);
    else txsByMerchant.set(key, [row.id]);
  }
  if (txsByMerchant.size === 0) return 0;

  const merchants = Array.from(txsByMerchant.keys());
  const known = await db
    .select({
      merchant: merchant_categories.merchant,
      category: merchant_categories.category,
    })
    .from(merchant_categories)
    .where(
      and(
        eq(merchant_categories.user_id, userId),
        inArray(merchant_categories.merchant, merchants),
      ),
    );

  const mapping = new Map(known.map((k) => [k.merchant, k.category]));
  const unseen = merchants.filter((m) => !mapping.has(m));

  if (unseen.length > 0 && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    let fresh: Map<string, string | null>;
    try {
      fresh = await aiCategorizeMerchants(unseen);
    } catch {
      fresh = new Map();
    }
    if (fresh.size > 0) {
      await db
        .insert(merchant_categories)
        .values(
          Array.from(fresh.entries()).map(([merchant, category]) => ({
            user_id: userId,
            merchant,
            category,
            source: "ai" as const,
          })),
        )
        .onConflictDoNothing();
      for (const [merchant, category] of fresh) {
        mapping.set(merchant, category);
      }
    }
  }

  let updated = 0;
  for (const [merchant, txIds] of txsByMerchant) {
    const category = mapping.get(merchant);
    if (!category) continue;
    await db
      .update(transactions)
      .set({ tags: [category] })
      .where(
        and(
          eq(transactions.user_id, userId),
          inArray(transactions.id, txIds),
        ),
      );
    updated += txIds.length;
  }
  return updated;
}
