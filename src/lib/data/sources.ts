import { and, eq, like, max, notExists, sql } from "drizzle-orm";

import {
  MANUAL_SOURCE,
  kindOfSource,
  tabSourcesFrom,
  withoutArchived,
} from "@/lib/constants/sources";
import { getLedgerRecords } from "@/lib/data/ledgerWrites";
import { forUser, type UserScope } from "@/lib/db/scope";
import {
  accounts,
  api_integrations,
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
  ledger_transactions,
} from "@/lib/db/schema";
import { EXTERNAL_ID_PREFIX, isCsvExternalId } from "@/lib/externalIds";
import { isSyncable } from "@/lib/integrations";
import { sourcesOf } from "@/lib/ledger/movements";
import { getArchivedSources } from "@/lib/data/userSettings";
import { suggestedAccountCurrencies } from "@/lib/accountCurrencies";

const assetAccounts = eq(ledger_accounts.kind, "asset");

async function ledgerSourceCounts(
  userId: string,
): Promise<Array<{ source: string; count: number }>> {
  const scope = forUser(userId);
  const rows = await scope
    .select({
      source: ledger_accounts.key,
      count: sql<number>`count(distinct ${ledger_entries.transaction_id})`,
    })
    .from(ledger_entries, assetAccounts)
    .innerJoin(
      ledger_accounts,
      and(
        eq(ledger_entries.account_id, ledger_accounts.id),
        scope.owns(ledger_accounts),
      ),
    )
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
  const scope = forUser(userId);
  const [row] = await scope
    .select({ last: max(ledger_entries.occurred_on) })
    .from(
      ledger_entries,
      and(
        assetAccounts,
        eq(ledger_accounts.key, source),
        notExists(
          scope
            .select({ id: ledger_external_ids.transaction_id })
            .from(
              ledger_external_ids,
              and(
                eq(
                  ledger_external_ids.transaction_id,
                  ledger_entries.transaction_id,
                ),
                like(
                  ledger_external_ids.external_id,
                  `${EXTERNAL_ID_PREFIX.opening}%`,
                ),
              ),
            ),
        ),
      ),
    )
    .innerJoin(
      ledger_accounts,
      and(
        eq(ledger_entries.account_id, ledger_accounts.id),
        scope.owns(ledger_accounts),
      ),
    );
  return row?.last ?? null;
}

export async function getSourceTransactionIds(
  scope: UserScope,
  source: string,
): Promise<string[]> {
  const rows = await scope
    .selectDistinct({ id: ledger_entries.transaction_id })
    .from(ledger_entries, and(assetAccounts, eq(ledger_accounts.key, source)))
    .innerJoin(
      ledger_accounts,
      and(
        eq(ledger_entries.account_id, ledger_accounts.id),
        scope.owns(ledger_accounts),
      ),
    );
  const pending = await scope
    .select({ id: ledger_transactions.id })
    .from(
      ledger_transactions,
      eq(ledger_transactions.transit_destination, source),
    );
  return [...new Set([...rows, ...pending].map((row) => row.id))];
}

export async function staleCsvTransactionIds(
  scope: UserScope,
  source: string,
  keep: ReadonlySet<string>,
): Promise<string[]> {
  const refs = await scope
    .select({
      transaction_id: ledger_external_ids.transaction_id,
      external_id: ledger_external_ids.external_id,
    })
    .from(ledger_external_ids, eq(ledger_external_ids.origin, source));
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
  const records = await getLedgerRecords(scope, candidates);
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
    forUser(userId).select({ source: accounts.source }).from(accounts),
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
    getArchivedSources(userId),
  ]);
  return withoutArchived(
    tabSourcesFrom(rows.map((r) => r.source)),
    settings?.archived_sources ?? [],
  ).filter((s) => s !== excludeSource && kindOfSource(s) !== "api");
}

export async function getUserSources(userId: string): Promise<string[]> {
  const [rows, accountRows] = await Promise.all([
    ledgerSources(userId),
    forUser(userId).select({ source: accounts.source }).from(accounts),
  ]);

  const set = new Set(rows.filter(Boolean));
  for (const { source } of accountRows) set.add(source);
  return tabSourcesFrom(Array.from(set)).sort();
}

export async function getSelectableSources(userId: string): Promise<string[]> {
  const [sources, integrationRows] = await Promise.all([
    getUserSources(userId),
    forUser(userId)
      .select({ provider: api_integrations.provider })
      .from(api_integrations),
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
  const scope = forUser(userId);
  const used = await scope
    .selectDistinct({
      source: ledger_accounts.key,
      currency: ledger_accounts.currency,
    })
    .from(ledger_entries, assetAccounts)
    .innerJoin(
      ledger_accounts,
      and(
        eq(ledger_entries.account_id, ledger_accounts.id),
        scope.owns(ledger_accounts),
      ),
    );
  return suggestedAccountCurrencies(used);
}
