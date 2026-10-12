import { ActionError } from "@/lib/actionError";
import { and, eq, inArray } from "drizzle-orm";

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
import type { DbTx } from "@/lib/transferUnlink";
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

async function writeEntries(
  executor: Executor,
  userId: string,
  transactionId: string,
  draft: LedgerDraft,
) {
  const accountIds = await ensureAccounts(
    executor,
    userId,
    draft.lines.map((line) => line.account),
  );
  await executor.insert(ledger_entries).values(
    draft.lines.map((line) => ({
      user_id: userId,
      transaction_id: transactionId,
      account_id: accountIds.get(accountRefId(line.account))!,
      currency: line.account.currency,
      role: line.role,
      amount: line.amount,
      occurred_on: line.occurredOn,
      legacy_tx_id: line.legacyTxId,
    })),
  );
  if (draft.externalRefs.length > 0) {
    await executor.insert(ledger_external_ids).values(
      draft.externalRefs.map((ref) => ({
        user_id: userId,
        origin: ref.origin,
        external_id: ref.externalId,
        transaction_id: transactionId,
      })),
    );
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
  };
}

async function snapshotRevision(
  executor: Executor,
  userId: string,
  transactionId: string,
): Promise<boolean> {
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
  if (!transaction) return false;
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
  return true;
}

async function replaceTransaction(
  executor: Executor,
  userId: string,
  transactionId: string,
  draft: LedgerDraft,
) {
  const found = await snapshotRevision(executor, userId, transactionId);
  if (!found) throw new LedgerPostingError("Transaction not found");
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
  await writeEntries(executor, userId, transactionId, draft);
}

async function insertTransaction(
  executor: Executor,
  userId: string,
  transactionId: string,
  draft: LedgerDraft,
) {
  await executor.insert(ledger_transactions).values({
    id: transactionId,
    user_id: userId,
    ...transactionRow(draft),
  });
  await writeEntries(executor, userId, transactionId, draft);
}

export async function postLedgerTransaction(
  userId: string,
  draft: LedgerDraft,
  options: { replaceId?: string; executor?: DbTx } = {},
): Promise<string> {
  const error = postingError(draft);
  if (error) throw new LedgerPostingError(error);
  const transactionId = options.replaceId ?? crypto.randomUUID();
  const write = (executor: Executor) =>
    options.replaceId
      ? replaceTransaction(executor, userId, transactionId, draft)
      : insertTransaction(executor, userId, transactionId, draft);
  if (options.executor) await write(options.executor);
  else await db.transaction((tx) => write(tx));
  return transactionId;
}

export async function deleteLedgerTransactions(
  userId: string,
  transactionIds: ReadonlyArray<string>,
  executor?: DbTx,
): Promise<number> {
  if (transactionIds.length === 0) return 0;
  const ids = [...transactionIds];
  const remove = async (tx: Executor) => {
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
    const deleted = await tx
      .delete(ledger_transactions)
      .where(
        and(
          eq(ledger_transactions.user_id, userId),
          inArray(ledger_transactions.id, ids),
        ),
      )
      .returning({ id: ledger_transactions.id });
    return deleted.length;
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
  const [transactions, entries, accounts, externalIds, scaleOf] =
    await Promise.all([
      executor
        .select()
        .from(ledger_transactions)
        .where(
          and(
            eq(ledger_transactions.user_id, userId),
            inArray(ledger_transactions.id, ids),
          ),
        ),
      executor
        .select()
        .from(ledger_entries)
        .where(
          and(
            eq(ledger_entries.user_id, userId),
            inArray(ledger_entries.transaction_id, ids),
          ),
        ),
      executor
        .select()
        .from(ledger_accounts)
        .where(eq(ledger_accounts.user_id, userId)),
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
            inArray(ledger_external_ids.transaction_id, ids),
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
