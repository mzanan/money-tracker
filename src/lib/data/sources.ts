import { asc, desc, eq, sql } from "drizzle-orm";

import { kindOfSource } from "@/lib/constants/sources";
import { db } from "@/lib/db";
import { accounts, transactions, user_settings } from "@/lib/db/schema";
import { isSyncable } from "@/lib/integrations";

export interface ImportedSource {
  source: string;
  count: number;
}

export async function getImportedSources(
  userId: string,
): Promise<ImportedSource[]> {
  const [rows, accountRows] = await Promise.all([
    db
      .select({
        source: transactions.source,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(eq(transactions.user_id, userId))
      .groupBy(transactions.source)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ source: accounts.source })
      .from(accounts)
      .where(eq(accounts.user_id, userId)),
  ]);

  const sources = rows.map((r) => ({ source: r.source, count: Number(r.count) }));
  const knownSources = new Set(sources.map((s) => s.source));
  for (const { source } of accountRows) {
    if (!knownSources.has(source)) {
      sources.push({ source, count: 0 });
      knownSources.add(source);
    }
  }
  return sources;
}

export async function getTransferSources(
  userId: string,
  excludeSource: string,
): Promise<string[]> {
  const rows = await getImportedSources(userId);
  return rows
    .map((r) => r.source)
    .filter((s) => s !== excludeSource && kindOfSource(s) !== "api");
}

export async function getUserSources(userId: string): Promise<string[]> {
  const [rows, accountRows, settings] = await Promise.all([
    db
      .selectDistinct({ source: transactions.source })
      .from(transactions)
      .where(eq(transactions.user_id, userId)),
    db
      .select({ source: accounts.source })
      .from(accounts)
      .where(eq(accounts.user_id, userId)),
    db
      .select({ cash_enabled: user_settings.cash_enabled })
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))
      .limit(1)
      .then((r) => r[0]),
  ]);

  const set = new Set(rows.map((r) => r.source).filter(Boolean));
  for (const { source } of accountRows) set.add(source);
  if (settings?.cash_enabled) set.add("manual");
  return Array.from(set).sort();
}

export async function getCsvSources(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ source: transactions.source })
    .from(transactions)
    .where(eq(transactions.user_id, userId))
    .orderBy(asc(transactions.source));

  return rows
    .map((r) => r.source)
    .filter((source) => source && source !== "manual" && !isSyncable(source));
}
