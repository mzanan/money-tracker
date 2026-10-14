import { ActionError } from "@/lib/actionError";
import { and, between, eq, inArray, like } from "drizzle-orm";

import { getAccountLabels } from "@/lib/data/accounts";
import { db } from "@/lib/db";
import {
  crypto_assets,
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
import { scaleResolver, type ScaleOf } from "@/lib/ledger/scale";
import type { DbTx } from "@/lib/db";
import type { LedgerEntry, LedgerRevisionSnapshot } from "@/types/db";
import type { Movement } from "@/types/ledger";

type Executor = typeof db | DbTx;

export class LedgerPostingError extends ActionError {}

export async function getScaleOf(): Promise<ScaleOf> {
  const rows = await db
    .select({ code: crypto_assets.code, scale: crypto_assets.scale })
    .from(crypto_assets);
  return scaleResolver(rows);
}

async function ensureAccounts(
  executor: Executor,
  userId: string,
  refs: ReadonlyArray<AccountRef>,
): Promise<Map<string, string>> {
  const wanted = new Map(refs.map((ref) => [accountRefId(ref), ref]));
  const existing = await executor
    .select()
    .from(ledger_accounts)
    .where(eq(ledger_accounts.user_id, userId));
  const ids = new Map(
    existing.map((row) => [
      accountRefId({ kind: row.kind, key: row.key, currency: row.currency }),
      row.id,
    ]),
  );
  const missing = [...wanted].filter(([id]) => !ids.has(id));
  if (missing.length === 0) return ids;
  const labels = await getAccountLabels(userId);
  const rows = missing.map(([id, ref]) => {
    const rowId = crypto.randomUUID();
    ids.set(id, rowId);
    return {
      id: rowId,
      user_id: userId,
      kind: ref.kind,
      key: ref.key,
      institution: accountInstitution(ref),
      name: accountName(ref, labels),
      currency: ref.currency,
    };
  });
  await executor.insert(ledger_accounts).values(rows);
  return ids;
}

const WRITE_CHUNK = 100;

function chunked<T>(items: ReadonlyArray<T>, size = WRITE_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

interface DraftWrite {
  id: string;
  draft: LedgerDraft;
}

async function writeEntries(
  executor: Executor,
  userId: string,
  writes: ReadonlyArray<DraftWrite>,
) {
  const accountIds = await ensureAccounts(
    executor,
    userId,
    writes.flatMap(({ draft }) => draft.lines.map((line) => line.account)),
  );
  const entryRows = writes.flatMap(({ id, draft }) =>
    draft.lines.map((line) => ({
      user_id: userId,
      transaction_id: id,
      account_id: accountIds.get(accountRefId(line.account))!,
      currency: line.account.currency,
      role: line.role,
      amount: line.amount,
      occurred_on: line.occurredOn,
      legacy_tx_id: line.legacyTxId,
    })),
  );
  for (const batch of chunked(entryRows)) {
    await executor.insert(ledger_entries).values(batch);
  }
  const refRows = writes.flatMap(({ id, draft }) =>
    draft.externalRefs.map((ref) => ({
      user_id: userId,
      origin: ref.origin,
      external_id: ref.externalId,
      transaction_id: id,
    })),
  );
  for (const batch of chunked(refRows)) {
    await executor.insert(ledger_external_ids).values(batch);
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
  executor: Executor,
  userId: string,
  transactionId: string,
): Promise<LedgerRevisionSnapshot | null> {
  const [transaction] = await executor
    .select()
    .from(ledger_transactions)
    .where(
      and(
        eq(ledger_transactions.user_id, userId),
        eq(ledger_transactions.id, transactionId),
      ),
    )
    .limit(1);
  if (!transaction) return null;
  const entries = await executor
    .select()
    .from(ledger_entries)
    .where(
      and(
        eq(ledger_entries.user_id, userId),
        eq(ledger_entries.transaction_id, transactionId),
      ),
    );
  await executor.insert(ledger_revisions).values({
    user_id: userId,
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
  executor: Executor,
  userId: string,
  current: ReadonlyArray<LedgerEntry>,
  expected: ReadonlyArray<PostingLine>,
): Promise<boolean> {
  const accountIds = [...new Set(current.map((entry) => entry.account_id))];
  const accounts =
    accountIds.length === 0
      ? []
      : await executor
          .select()
          .from(ledger_accounts)
          .where(
            and(
              eq(ledger_accounts.user_id, userId),
              inArray(ledger_accounts.id, accountIds),
            ),
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
  executor: Executor,
  userId: string,
  transactionId: string,
  draft: LedgerDraft,
  expected?: LedgerDraft,
) {
  const snapshot = await snapshotRevision(executor, userId, transactionId);
  if (!snapshot) throw new LedgerPostingError("Transaction not found");
  if (
    expected &&
    (!sameHeader(snapshot.transaction, expected) ||
      !(await sameEntries(
        executor,
        userId,
        snapshot.entries,
        expected.lines,
      )))
  ) {
    throw new LedgerPostingError("Transaction changed, reload and retry");
  }
  const owned = and(
    eq(ledger_entries.user_id, userId),
    eq(ledger_entries.transaction_id, transactionId),
  );
  await executor.delete(ledger_entries).where(owned);
  await executor
    .delete(ledger_external_ids)
    .where(
      and(
        eq(ledger_external_ids.user_id, userId),
        eq(ledger_external_ids.transaction_id, transactionId),
      ),
    );
  await executor
    .update(ledger_transactions)
    .set(transactionRow(draft))
    .where(
      and(
        eq(ledger_transactions.user_id, userId),
        eq(ledger_transactions.id, transactionId),
      ),
    );
  await writeEntries(executor, userId, [{ id: transactionId, draft }]);
}

async function insertTransactions(
  executor: Executor,
  userId: string,
  writes: ReadonlyArray<DraftWrite>,
) {
  for (const batch of chunked(writes)) {
    await executor.insert(ledger_transactions).values(
      batch.map(({ id, draft }) => ({
        id,
        user_id: userId,
        ...transactionRow(draft),
      })),
    );
  }
  await writeEntries(executor, userId, writes);
}

export async function postLedgerTransaction(
  userId: string,
  draft: LedgerDraft,
  options: {
    replaceId?: string;
    id?: string;
    executor?: DbTx;
    expected?: LedgerDraft;
  } = {},
): Promise<string> {
  const error = postingError(draft);
  if (error) throw new LedgerPostingError(error);
  const transactionId = options.replaceId ?? options.id ?? crypto.randomUUID();
  const write = (executor: Executor) =>
    options.replaceId
      ? replaceTransaction(
          executor,
          userId,
          transactionId,
          draft,
          options.expected,
        )
      : insertTransactions(executor, userId, [{ id: transactionId, draft }]);
  if (options.executor) await write(options.executor);
  else await db.transaction((tx) => write(tx));
  return transactionId;
}

export async function postLedgerTransactions(
  userId: string,
  drafts: ReadonlyArray<{ id?: string; draft: LedgerDraft }>,
  executor?: DbTx,
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
  const write = (tx: Executor) => insertTransactions(tx, userId, writes);
  if (executor) await write(executor);
  else await db.transaction((tx) => write(tx));
  return writes.map(({ id }) => id);
}

export async function existingExternalIds(
  userId: string,
  origin: string,
  externalIds: ReadonlyArray<string>,
  executor: Executor = db,
): Promise<Set<string>> {
  const found = new Set<string>();
  for (const batch of chunked([...new Set(externalIds)], 500)) {
    const rows = await executor
      .select({ external_id: ledger_external_ids.external_id })
      .from(ledger_external_ids)
      .where(
        and(
          eq(ledger_external_ids.user_id, userId),
          eq(ledger_external_ids.origin, origin),
          inArray(ledger_external_ids.external_id, batch),
        ),
      );
    for (const row of rows) found.add(row.external_id);
  }
  return found;
}

export async function externalIdsWithPrefix(
  userId: string,
  origin: string,
  prefix: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ external_id: ledger_external_ids.external_id })
    .from(ledger_external_ids)
    .where(
      and(
        eq(ledger_external_ids.user_id, userId),
        eq(ledger_external_ids.origin, origin),
        like(ledger_external_ids.external_id, `${prefix}%`),
      ),
    );
  return new Set(rows.map((row) => row.external_id));
}

export async function getLedgerRecordsBetween(
  userId: string,
  start: string,
  end: string,
  executor: Executor = db,
): Promise<LedgerRecord[]> {
  const rows = await executor
    .selectDistinct({ id: ledger_entries.transaction_id })
    .from(ledger_entries)
    .where(
      and(
        eq(ledger_entries.user_id, userId),
        between(ledger_entries.occurred_on, start, end),
      ),
    );
  const records = await getLedgerRecords(
    userId,
    rows.map((row) => row.id),
    executor,
  );
  return [...records.values()];
}

export async function deleteLedgerTransactions(
  userId: string,
  transactionIds: ReadonlyArray<string>,
  executor?: DbTx,
): Promise<number> {
  if (transactionIds.length === 0) return 0;
  const remove = async (tx: Executor) => {
    let deleted = 0;
    for (const ids of chunked([...transactionIds], 500)) {
      await tx
        .delete(ledger_entries)
        .where(
          and(
            eq(ledger_entries.user_id, userId),
            inArray(ledger_entries.transaction_id, ids),
          ),
        );
      await tx
        .delete(ledger_external_ids)
        .where(
          and(
            eq(ledger_external_ids.user_id, userId),
            inArray(ledger_external_ids.transaction_id, ids),
          ),
        );
      await tx
        .delete(ledger_revisions)
        .where(
          and(
            eq(ledger_revisions.user_id, userId),
            inArray(ledger_revisions.transaction_id, ids),
          ),
        );
      const rows = await tx
        .delete(ledger_transactions)
        .where(
          and(
            eq(ledger_transactions.user_id, userId),
            inArray(ledger_transactions.id, ids),
          ),
        )
        .returning({ id: ledger_transactions.id });
      deleted += rows.length;
    }
    return deleted;
  };
  return executor ? remove(executor) : db.transaction((tx) => remove(tx));
}

export interface LedgerRecord {
  movement: Movement;
  draft: LedgerDraft;
}

export async function getLedgerRecords(
  userId: string,
  transactionIds: ReadonlyArray<string>,
  executor: Executor = db,
): Promise<Map<string, LedgerRecord>> {
  const ids = [...new Set(transactionIds)];
  if (ids.length === 0) return new Map();
  const byChunk = async <T>(
    fetch: (chunk: string[]) => Promise<T[]>,
  ): Promise<T[]> => {
    const rows: T[] = [];
    for (const chunk of chunked(ids, 500)) rows.push(...(await fetch(chunk)));
    return rows;
  };
  const [transactions, entries, accounts, externalIds, scaleOf] =
    await Promise.all([
      byChunk((chunk) =>
        executor
          .select()
          .from(ledger_transactions)
          .where(
            and(
              eq(ledger_transactions.user_id, userId),
              inArray(ledger_transactions.id, chunk),
            ),
          ),
      ),
      byChunk((chunk) =>
        executor
          .select()
          .from(ledger_entries)
          .where(
            and(
              eq(ledger_entries.user_id, userId),
              inArray(ledger_entries.transaction_id, chunk),
            ),
          ),
      ),
      executor
        .select()
        .from(ledger_accounts)
        .where(eq(ledger_accounts.user_id, userId)),
      byChunk((chunk) =>
        executor
          .select({
            transaction_id: ledger_external_ids.transaction_id,
            origin: ledger_external_ids.origin,
            external_id: ledger_external_ids.external_id,
          })
          .from(ledger_external_ids)
          .where(
            and(
              eq(ledger_external_ids.user_id, userId),
              inArray(ledger_external_ids.transaction_id, chunk),
            ),
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
  userId: string,
  transactionId: string,
  executor: Executor = db,
): Promise<LedgerRecord | null> {
  const records = await getLedgerRecords(userId, [transactionId], executor);
  return records.get(transactionId) ?? null;
}
