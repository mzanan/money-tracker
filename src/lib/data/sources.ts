import { and, eq, max, sql } from "drizzle-orm";

import {
  MANUAL_SOURCE,
  kindOfSource,
  tabSourcesFrom,
  withoutArchived,
} from "@/lib/constants/sources";
import { getLedgerRecords } from "@/lib/data/ledgerWrites";
import { db, type DbTx } from "@/lib/db";
import {
  accounts,
  api_integrations,
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
  ledger_transactions,
  user_settings,
} from "@/lib/db/schema";
import { isCsvExternalId } from "@/lib/externalIds";
import { isSyncable } from "@/lib/integrations";
import { sourcesOf } from "@/lib/ledger/movements";
import { suggestedAccountCurrencies } from "@/lib/accountCurrencies";

const assetEntriesOf = (userId: string) =>
  and(eq(ledger_entries.user_id, userId), eq(ledger_accounts.kind, "asset"));

async function ledgerSourceCounts(
  userId: string,
): Promise<Array<{ source: string; count: number }>> {
  const rows = await db
    .select({
      source: ledger_accounts.key,
      count: sql<number>`count(distinct ${ledger_entries.transaction_id})`,
    })
    .from(ledger_entries)
    .innerJoin(
      ledger_accounts,
      eq(ledger_entries.account_id, ledger_accounts.id),
    )
    .where(assetEntriesOf(userId))
    .groupBy(ledger_accounts.key);
  return rows
    .map((row) => ({ source: row.source, count: Number(row.count) }))
    .sort((a, b) => b.count - a.count);
}

async function ledgerSources(userId: string): Promise<string[]> {
  return (await ledgerSourceCounts(userId)).map((row) => row.source);
}

export async function getLastEntryDate(
  userId: string,
  source: string,
): Promise<string | null> {
  const [row] = await db
    .select({ last: max(ledger_entries.occurred_on) })
    .from(ledger_entries)
    .innerJoin(
      ledger_accounts,
      eq(ledger_entries.account_id, ledger_accounts.id),
    )
    .where(and(assetEntriesOf(userId), eq(ledger_accounts.key, source)));
  return row?.last ?? null;
}

export async function getSourceTransactionIds(
  userId: string,
  source: string,
  executor: typeof db | DbTx = db,
): Promise<string[]> {
  const rows = await executor
    .selectDistinct({ id: ledger_entries.transaction_id })
    .from(ledger_entries)
    .innerJoin(
      ledger_accounts,
      eq(ledger_entries.account_id, ledger_accounts.id),
    )
    .where(and(assetEntriesOf(userId), eq(ledger_accounts.key, source)));
  const pending = await executor
    .select({ id: ledger_transactions.id })
    .from(ledger_transactions)
    .where(
      and(
        eq(ledger_transactions.user_id, userId),
        eq(ledger_transactions.transit_destination, source),
      ),
    );
  return [...new Set([...rows, ...pending].map((row) => row.id))];
}

export async function staleCsvTransactionIds(
  userId: string,
  source: string,
  keep: ReadonlySet<string>,
  executor: typeof db | DbTx = db,
): Promise<string[]> {
  const refs = await executor
    .select({
      transaction_id: ledger_external_ids.transaction_id,
      external_id: ledger_external_ids.external_id,
    })
    .from(ledger_external_ids)
    .where(
      and(
        eq(ledger_external_ids.user_id, userId),
        eq(ledger_external_ids.origin, source),
      ),
    );
  const csvRefs = refs.filter((ref) => isCsvExternalId(ref.external_id));
  const kept = new Set(
    csvRefs
      .filter((ref) => keep.has(ref.external_id))
      .map((ref) => ref.transaction_id),
  );
  const candidates = [
    ...new Set(
      csvRefs
        .filter((ref) => !kept.has(ref.transaction_id))
        .map((ref) => ref.transaction_id),
    ),
  ];
  if (candidates.length === 0) return [];
  const records = await getLedgerRecords(userId, candidates, executor);
  return candidates.filter((id) => {
    const movement = records.get(id)?.movement;
    return (
      movement !== undefined &&
      sourcesOf(movement).every((key) => key === source)
    );
  });
}

export interface ImportedSource {
  source: string;
  count: number;
}

export async function getImportedSources(
  userId: string,
): Promise<ImportedSource[]> {
  const [rows, accountRows] = await Promise.all([
    ledgerSourceCounts(userId),
    db
      .select({ source: accounts.source })
      .from(accounts)
      .where(eq(accounts.user_id, userId)),
  ]);

  const sources = [...rows];
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
  const [rows, settings] = await Promise.all([
    getImportedSources(userId),
    db
      .select({ archived: user_settings.archived_sources })
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))
      .limit(1)
      .then((r) => r[0]),
  ]);
  return withoutArchived(
    tabSourcesFrom(rows.map((r) => r.source)),
    settings?.archived ?? [],
  ).filter((s) => s !== excludeSource && kindOfSource(s) !== "api");
}

export async function getUserSources(userId: string): Promise<string[]> {
  const [rows, accountRows] = await Promise.all([
    ledgerSources(userId),
    db
      .select({ source: accounts.source })
      .from(accounts)
      .where(eq(accounts.user_id, userId)),
  ]);

  const set = new Set(rows.filter(Boolean));
  for (const { source } of accountRows) set.add(source);
  return tabSourcesFrom(Array.from(set)).sort();
}

export async function getSelectableSources(userId: string): Promise<string[]> {
  const [sources, integrationRows] = await Promise.all([
    getUserSources(userId),
    db
      .select({ provider: api_integrations.provider })
      .from(api_integrations)
      .where(eq(api_integrations.user_id, userId)),
  ]);

  const set = new Set(sources);
  for (const { provider } of integrationRows) set.add(provider);
  return Array.from(set).sort();
}

export async function getCsvSources(userId: string): Promise<string[]> {
  const rows = await ledgerSources(userId);
  return rows
    .filter(
      (source) => source && source !== MANUAL_SOURCE && !isSyncable(source),
    )
    .sort();
}

export async function getSuggestedAccountCurrencies(
  userId: string,
): Promise<Record<string, string>> {
  const used = await db
    .selectDistinct({
      source: ledger_accounts.key,
      currency: ledger_accounts.currency,
    })
    .from(ledger_entries)
    .innerJoin(
      ledger_accounts,
      eq(ledger_entries.account_id, ledger_accounts.id),
    )
    .where(assetEntriesOf(userId));
  return suggestedAccountCurrencies(used);
}
