import { ActionError } from "@/lib/actionError";
import { and, between, eq, inArray, like, min, sum } from "drizzle-orm";

import { chunk } from "@/lib/arrays";
import { getAccountLabels } from "@/lib/data/accounts";
import { forUser, type UserScope } from "@/lib/db/scope";
import {
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
  ledger_revisions,
  ledger_transactions,
} from "@/lib/db/schema";
import {
  accountInstitution,
  accountName,
  accountRefId,
  type AccountRef,
} from "@/lib/ledger/accounts";
import { buildRawMovements } from "@/lib/ledger/movements";
import {
  postingError,
  type LedgerDraft,
  type PostingLine,
} from "@/lib/ledger/posting";
import { getScaleOf } from "@/lib/data/cryptoAssets";
import type { LedgerEntry, LedgerRevisionSnapshot } from "@/types/db";
import type { Movement } from "@/types/ledger";

export class LedgerPostingError extends ActionError {}

async function ensureAccounts(
  scope: UserScope,
  refs: ReadonlyArray<AccountRef>,
): Promise<Map<string, string>> {
  const wanted = new Map(refs.map((ref) => [accountRefId(ref), ref]));
  const existing = await scope.selectFrom(ledger_accounts);
  const ids = new Map(
    existing.map((row) => [
      accountRefId({ kind: row.kind, key: row.key, currency: row.currency }),
      row.id,
    ]),
  );
  const missing = [...wanted].filter(([id]) => !ids.has(id));
  if (missing.length === 0) return ids;
  const labels = await getAccountLabels(scope.userId);
  const rows = missing.map(([id, ref]) => {
    const rowId = crypto.randomUUID();
    ids.set(id, rowId);
    return {
      id: rowId,
      kind: ref.kind,
      key: ref.key,
      institution: accountInstitution(ref),
      name: accountName(ref, labels),
      currency: ref.currency,
    };
  });
  await scope.insert(ledger_accounts, rows);
  return ids;
}

const WRITE_CHUNK = 100;

const READ_CHUNK = 500;

interface DraftWrite {
  id: string;
  draft: LedgerDraft;
}

async function writeEntries(
  scope: UserScope,
  writes: ReadonlyArray<DraftWrite>,
) {
  const accountIds = await ensureAccounts(
    scope,
    writes.flatMap(({ draft }) => draft.lines.map((line) => line.account)),
  );
  const entryRows = writes.flatMap(({ id, draft }) =>
    draft.lines.map((line) => ({
      transaction_id: id,
      account_id: accountIds.get(accountRefId(line.account))!,
      currency: line.account.currency,
      role: line.role,
      amount: line.amount,
      occurred_on: line.occurredOn,
      legacy_tx_id: line.legacyTxId,
    })),
  );
  for (const batch of chunk(entryRows, WRITE_CHUNK)) {
    await scope.insert(ledger_entries, batch);
  }
  const refRows = writes.flatMap(({ id, draft }) =>
    draft.externalRefs.map((ref) => ({
      origin: ref.origin,
      external_id: ref.externalId,
      transaction_id: id,
    })),
  );
  for (const batch of chunk(refRows, WRITE_CHUNK)) {
    await scope.insert(ledger_external_ids, batch);
  }
}

function transactionRow(draft: LedgerDraft) {
  return {
    occurred_on: draft.occurredOn,
    occurred_at: draft.occurredAt,
    note: draft.note,
    comment: draft.comment,
    tags: draft.tags,
    recurring_id: draft.recurringId,
    is_fixed: draft.isFixed,
    budget_month: draft.budgetMonth,
    transit_destination: draft.transitDestination ?? null,
  };
}

async function snapshotRevision(
  scope: UserScope,
  transactionId: string,
): Promise<LedgerRevisionSnapshot | null> {
  const [transaction] = await scope
    .selectFrom(ledger_transactions, eq(ledger_transactions.id, transactionId))
    .limit(1);
  if (!transaction) return null;
  const entries = await scope.selectFrom(
    ledger_entries,
    eq(ledger_entries.transaction_id, transactionId),
  );
  await scope.insert(ledger_revisions, {
    transaction_id: transactionId,
    snapshot: { transaction, entries },
  });
  return { transaction, entries };
}

function entrySignature(entry: {
  account: string;
  amount: number;
  role: string;
  occurredOn: string;
}): string {
  return `${entry.account}|${entry.amount}|${entry.role}|${entry.occurredOn}`;
}

async function sameEntries(
  scope: UserScope,
  current: ReadonlyArray<LedgerEntry>,
  expected: ReadonlyArray<PostingLine>,
): Promise<boolean> {
  const accountIds = [...new Set(current.map((entry) => entry.account_id))];
  const accounts =
    accountIds.length === 0
      ? []
      : await scope.selectFrom(
          ledger_accounts,
          inArray(ledger_accounts.id, accountIds),
        );
  const refIds = new Map(
    accounts.map((row) => [
      row.id,
      accountRefId({ kind: row.kind, key: row.key, currency: row.currency }),
    ]),
  );
  const a = current
    .map((entry) =>
      entrySignature({
        account: refIds.get(entry.account_id) ?? entry.account_id,
        amount: entry.amount,
        role: entry.role,
        occurredOn: entry.occurred_on,
      }),
    )
    .sort();
  const b = expected
    .map((line) =>
      entrySignature({
        account: accountRefId(line.account),
        amount: line.amount,
        role: line.role,
        occurredOn: line.occurredOn,
      }),
    )
    .sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameHeader(
  current: LedgerRevisionSnapshot["transaction"],
  expected: LedgerDraft,
): boolean {
  const row = transactionRow(expected);
  return (Object.keys(row) as Array<keyof typeof row>).every(
    (key) =>
      JSON.stringify(current[key] ?? null) === JSON.stringify(row[key] ?? null),
  );
}

async function replaceTransaction(
  scope: UserScope,
  transactionId: string,
  draft: LedgerDraft,
  expected?: LedgerDraft,
) {
  const snapshot = await snapshotRevision(scope, transactionId);
  if (!snapshot) throw new LedgerPostingError("Transaction not found");
  if (
    expected &&
    (!sameHeader(snapshot.transaction, expected) ||
      !(await sameEntries(scope, snapshot.entries, expected.lines)))
  ) {
    throw new LedgerPostingError("Transaction changed, reload and retry");
  }
  await scope.delete(
    ledger_entries,
    eq(ledger_entries.transaction_id, transactionId),
  );
  await scope.delete(
    ledger_external_ids,
    eq(ledger_external_ids.transaction_id, transactionId),
  );
  await scope.update(
    ledger_transactions,
    transactionRow(draft),
    eq(ledger_transactions.id, transactionId),
  );
  await writeEntries(scope, [{ id: transactionId, draft }]);
}

async function insertTransactions(
  scope: UserScope,
  writes: ReadonlyArray<DraftWrite>,
) {
  for (const batch of chunk(writes, WRITE_CHUNK)) {
    await scope.insert(
      ledger_transactions,
      batch.map(({ id, draft }) => ({
        id,
        ...transactionRow(draft),
      })),
    );
  }
  await writeEntries(scope, writes);
}

export async function postLedgerTransaction(
  scope: UserScope,
  draft: LedgerDraft,
  options: {
    replaceId?: string;
    id?: string;
    expected?: LedgerDraft;
  } = {},
): Promise<string> {
  const error = postingError(draft);
  if (error) throw new LedgerPostingError(error);
  const transactionId = options.replaceId ?? options.id ?? crypto.randomUUID();
  await scope.atomic((txScope) =>
    options.replaceId
      ? replaceTransaction(txScope, transactionId, draft, options.expected)
      : insertTransactions(txScope, [{ id: transactionId, draft }]),
  );
  return transactionId;
}

export async function postLedgerTransactions(
  scope: UserScope,
  drafts: ReadonlyArray<{ id?: string; draft: LedgerDraft }>,
): Promise<string[]> {
  for (const { draft } of drafts) {
    const error = postingError(draft);
    if (error) throw new LedgerPostingError(error);
  }
  if (drafts.length === 0) return [];
  const writes = drafts.map(({ id, draft }) => ({
    id: id ?? crypto.randomUUID(),
    draft,
  }));
  await scope.atomic((txScope) => insertTransactions(txScope, writes));
  return writes.map(({ id }) => id);
}

export async function existingExternalIds(
  scope: UserScope,
  origin: string,
  externalIds: ReadonlyArray<string>,
): Promise<Set<string>> {
  const found = new Set<string>();
  for (const batch of chunk([...new Set(externalIds)], READ_CHUNK)) {
    const rows = await scope
      .select({ external_id: ledger_external_ids.external_id })
      .from(
        ledger_external_ids,
        and(
          eq(ledger_external_ids.origin, origin),
          inArray(ledger_external_ids.external_id, batch),
        ),
      );
    for (const row of rows) found.add(row.external_id);
  }
  return found;
}

export async function transactionIdsForExternalIds(
  userId: string,
  origin: string,
  externalIds: ReadonlyArray<string>,
): Promise<Set<string>> {
  const scope = forUser(userId);
  const found = new Set<string>();
  for (const batch of chunk([...externalIds], READ_CHUNK)) {
    const rows = await scope
      .select({ id: ledger_external_ids.transaction_id })
      .from(
        ledger_external_ids,
        and(
          eq(ledger_external_ids.origin, origin),
          inArray(ledger_external_ids.external_id, batch),
        ),
      );
    for (const row of rows) found.add(row.id);
  }
  return found;
}

export async function existingExternalRefs(
  userId: string,
  origin: string,
  externalIds: ReadonlyArray<string>,
): Promise<Map<string, string>> {
  const scope = forUser(userId);
  const found = new Map<string, string>();
  for (const batch of chunk([...new Set(externalIds)], READ_CHUNK)) {
    const rows = await scope
      .select({
        external_id: ledger_external_ids.external_id,
        transaction_id: ledger_external_ids.transaction_id,
      })
      .from(
        ledger_external_ids,
        and(
          eq(ledger_external_ids.origin, origin),
          inArray(ledger_external_ids.external_id, batch),
        ),
      );
    for (const row of rows) found.set(row.external_id, row.transaction_id);
  }
  return found;
}

export async function externalIdsWithPrefix(
  userId: string,
  origin: string,
  prefix: string,
): Promise<Set<string>> {
  const rows = await forUser(userId)
    .select({ external_id: ledger_external_ids.external_id })
    .from(
      ledger_external_ids,
      and(
        eq(ledger_external_ids.origin, origin),
        like(ledger_external_ids.external_id, `${prefix}%`),
      ),
    );
  return new Set(rows.map((row) => row.external_id));
}

export async function transactionIdForExternalId(
  userId: string,
  origin: string,
  externalId: string,
): Promise<string | null> {
  const [row] = await forUser(userId)
    .select({ id: ledger_external_ids.transaction_id })
    .from(
      ledger_external_ids,
      and(
        eq(ledger_external_ids.origin, origin),
        eq(ledger_external_ids.external_id, externalId),
      ),
    );
  return row?.id ?? null;
}

export async function sourceBalanceMinor(
  userId: string,
  source: string,
  currency: string,
): Promise<number> {
  const scope = forUser(userId);
  const [row] = await scope
    .select({ total: sum(ledger_entries.amount) })
    .from(
      ledger_entries,
      and(
        eq(ledger_accounts.kind, "asset"),
        eq(ledger_accounts.key, source),
        eq(ledger_accounts.currency, currency),
      ),
    )
    .innerJoin(
      ledger_accounts,
      and(
        eq(ledger_entries.account_id, ledger_accounts.id),
        scope.owns(ledger_accounts),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function firstSourceDate(
  userId: string,
  source: string,
): Promise<string | null> {
  const scope = forUser(userId);
  const [row] = await scope
    .select({ first: min(ledger_entries.occurred_on) })
    .from(
      ledger_entries,
      and(eq(ledger_accounts.kind, "asset"), eq(ledger_accounts.key, source)),
    )
    .innerJoin(
      ledger_accounts,
      and(
        eq(ledger_entries.account_id, ledger_accounts.id),
        scope.owns(ledger_accounts),
      ),
    );
  return row?.first ?? null;
}

export async function getLedgerRecordsBetween(
  scope: UserScope,
  start: string,
  end: string,
): Promise<LedgerRecord[]> {
  const rows = await scope
    .selectDistinct({ id: ledger_entries.transaction_id })
    .from(ledger_entries, between(ledger_entries.occurred_on, start, end));
  const records = await getLedgerRecords(
    scope,
    rows.map((row) => row.id),
  );
  return [...records.values()];
}

export async function deleteLedgerTransactions(
  scope: UserScope,
  transactionIds: ReadonlyArray<string>,
): Promise<number> {
  if (transactionIds.length === 0) return 0;
  const remove = async (txScope: UserScope) => {
    let deleted = 0;
    for (const ids of chunk([...transactionIds], READ_CHUNK)) {
      await txScope.delete(
        ledger_entries,
        inArray(ledger_entries.transaction_id, ids),
      );
      await txScope.delete(
        ledger_external_ids,
        inArray(ledger_external_ids.transaction_id, ids),
      );
      await txScope.delete(
        ledger_revisions,
        inArray(ledger_revisions.transaction_id, ids),
      );
      const rows = await txScope
        .delete(ledger_transactions, inArray(ledger_transactions.id, ids))
        .returning({ id: ledger_transactions.id });
      deleted += rows.length;
    }
    return deleted;
  };
  return scope.atomic(remove);
}

export interface LedgerRecord {
  movement: Movement;
  draft: LedgerDraft;
}

export async function getLedgerRecords(
  scope: UserScope,
  transactionIds: ReadonlyArray<string>,
): Promise<Map<string, LedgerRecord>> {
  const ids = [...new Set(transactionIds)];
  if (ids.length === 0) return new Map();
  const byChunk = async <T>(
    fetch: (part: string[]) => Promise<T[]>,
  ): Promise<T[]> => {
    const rows: T[] = [];
    for (const part of chunk(ids, READ_CHUNK))
      rows.push(...(await fetch(part)));
    return rows;
  };
  const [transactions, entries, accounts, externalIds, scaleOf] =
    await Promise.all([
      byChunk((chunk) =>
        scope.selectFrom(
          ledger_transactions,
          inArray(ledger_transactions.id, chunk),
        ),
      ),
      byChunk((chunk) =>
        scope.selectFrom(
          ledger_entries,
          inArray(ledger_entries.transaction_id, chunk),
        ),
      ),
      scope.selectFrom(ledger_accounts),
      byChunk((chunk) =>
        scope
          .select({
            transaction_id: ledger_external_ids.transaction_id,
            origin: ledger_external_ids.origin,
            external_id: ledger_external_ids.external_id,
          })
          .from(
            ledger_external_ids,
            inArray(ledger_external_ids.transaction_id, chunk),
          ),
      ),
      getScaleOf(),
    ]);
  const accountsById = new Map(accounts.map((row) => [row.id, row]));
  const movements = buildRawMovements(
    { transactions, entries, accounts, externalIds },
    scaleOf,
  );
  const records = new Map<string, LedgerRecord>();
  for (const movement of movements) {
    const tx = transactions.find((row) => row.id === movement.id)!;
    const lines: PostingLine[] = entries
      .filter((entry) => entry.transaction_id === movement.id)
      .flatMap((entry) => {
        const account = accountsById.get(entry.account_id);
        if (!account) return [];
        return [
          {
            account: {
              kind: account.kind,
              key: account.key,
              currency: account.currency,
            },
            amount: entry.amount,
            role: entry.role,
            occurredOn: entry.occurred_on,
            legacyTxId: entry.legacy_tx_id,
          },
        ];
      });
    records.set(movement.id, {
      movement,
      draft: {
        occurredOn: tx.occurred_on,
        occurredAt: tx.occurred_at,
        note: tx.note,
        comment: tx.comment,
        tags: tx.tags,
        recurringId: tx.recurring_id,
        isFixed: tx.is_fixed,
        budgetMonth: tx.budget_month,
        transitDestination: tx.transit_destination,
        lines,
        externalRefs: movement.externalRefs.map((ref) => ({ ...ref })),
      },
    });
  }
  return records;
}

export async function getLedgerRecord(
  scope: UserScope,
  transactionId: string,
): Promise<LedgerRecord | null> {
  const records = await getLedgerRecords(scope, [transactionId]);
  return records.get(transactionId) ?? null;
}
