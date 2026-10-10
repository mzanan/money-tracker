import { config } from "dotenv";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { getAccountLabels } from "../src/lib/data/accounts";
import { db } from "../src/lib/db";
import {
  crypto_assets,
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
  ledger_transactions,
  transactions,
} from "../src/lib/db/schema";
import {
  accountInstitution,
  accountName,
  accountRefId,
  type AccountRef,
} from "../src/lib/ledger/accounts";
import {
  BLOCKING_REVIEW_REASONS,
  balanceMismatches,
  legacyAssetBalances,
  planLedgerMigration,
  plannedAssetBalances,
  type BalanceMismatch,
  type MigrationPlan,
  type PlannedTransaction,
} from "../src/lib/ledger/migration";
import { scaleResolver, type ScaleOf } from "../src/lib/ledger/scale";

config({ path: ".env.local" });
config();

delete process.env.TURSO_EMBEDDED_REPLICA_PATH;

const CHUNK_SIZE = 100;

const apply = process.argv.includes("--apply");
const reset = process.argv.includes("--reset");
const userArg = process.argv.find((arg) => arg.startsWith("--user="));
const onlyUser = userArg === undefined ? null : userArg.slice("--user=".length);

type Db = typeof db;
type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function chunks<T>(items: ReadonlyArray<T>): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    out.push(items.slice(i, i + CHUNK_SIZE));
  }
  return out;
}

function printMismatches(label: string, mismatches: BalanceMismatch[]) {
  if (mismatches.length === 0) {
    console.log(`  ${label}: every asset balance matches`);
    return;
  }
  console.log(`  ${label}: ${mismatches.length} MISMATCHED balances`);
  for (const row of mismatches) {
    console.log(
      `    ${row.accountRefId} expected ${row.expected} got ${row.actual}`,
    );
  }
}

function printPlan(plan: MigrationPlan, rowCount: number) {
  const entryCount = plan.transactions.reduce(
    (sum, transaction) => sum + transaction.lines.length,
    0,
  );
  console.log(
    `  ${rowCount} legacy rows -> ${plan.transactions.length} ledger transactions, ${entryCount} entries`,
  );
  console.log(`  manual review: ${plan.review.length}`);
  for (const item of plan.review) {
    console.log(
      `    [${item.reason}] ${item.legacyTxIds.join(", ")} ${item.detail}`,
    );
  }
}

async function ledgerTransactionCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ledger_transactions)
    .where(eq(ledger_transactions.user_id, userId));
  return row?.count ?? 0;
}

async function nonLegacyEntryCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ledger_entries)
    .where(
      and(
        eq(ledger_entries.user_id, userId),
        isNull(ledger_entries.legacy_tx_id),
      ),
    );
  return row?.count ?? 0;
}

async function clearLedger(tx: DbTx, userId: string) {
  await tx.delete(ledger_entries).where(eq(ledger_entries.user_id, userId));
  await tx
    .delete(ledger_external_ids)
    .where(eq(ledger_external_ids.user_id, userId));
  await tx
    .delete(ledger_transactions)
    .where(eq(ledger_transactions.user_id, userId));
  await tx.delete(ledger_accounts).where(eq(ledger_accounts.user_id, userId));
}

function accountRowsOf(
  userId: string,
  plan: MigrationPlan,
  labels: Record<string, string>,
) {
  const refs = new Map<string, AccountRef>();
  for (const transaction of plan.transactions) {
    for (const line of transaction.lines) {
      refs.set(accountRefId(line.account), line.account);
    }
  }
  const accountIds = new Map<string, string>();
  const accountRows = [...refs].map(([id, ref]) => {
    const rowId = crypto.randomUUID();
    accountIds.set(id, rowId);
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
  return { accountRows, accountIds };
}

async function writeAccounts(
  tx: DbTx,
  accountRows: ReturnType<typeof accountRowsOf>["accountRows"],
) {
  for (const batch of chunks(accountRows)) {
    await tx.insert(ledger_accounts).values(batch);
  }
}

async function writeTransactions(
  tx: DbTx,
  userId: string,
  planned: ReadonlyArray<PlannedTransaction>,
  accountIds: ReadonlyMap<string, string>,
) {
  const transactionRows = planned.map((transaction) => ({
    id: transaction.id,
    user_id: userId,
    occurred_on: transaction.occurredOn,
    occurred_at: transaction.occurredAt,
    note: transaction.note,
    comment: transaction.comment,
    tags: transaction.tags,
    recurring_id: transaction.recurringId,
    is_fixed: transaction.isFixed,
    budget_month: transaction.budgetMonth,
  }));
  for (const batch of chunks(transactionRows)) {
    await tx.insert(ledger_transactions).values(batch);
  }

  const entryRows = planned.flatMap((transaction) =>
    transaction.lines.map((line) => ({
      user_id: userId,
      transaction_id: transaction.id,
      account_id: accountIds.get(accountRefId(line.account))!,
      amount: line.amount,
      occurred_on: line.occurredOn,
      legacy_tx_id: line.legacyTxId,
    })),
  );
  for (const batch of chunks(entryRows)) {
    await tx.insert(ledger_entries).values(batch);
  }

  const externalRows = planned.flatMap((transaction) =>
    transaction.externalRefs.map((ref) => ({
      user_id: userId,
      origin: ref.origin,
      external_id: ref.externalId,
      transaction_id: transaction.id,
    })),
  );
  for (const batch of chunks(externalRows)) {
    await tx.insert(ledger_external_ids).values(batch);
  }
}

async function storedAssetBalances(
  userId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      kind: ledger_accounts.kind,
      key: ledger_accounts.key,
      currency: ledger_accounts.currency,
      total: sql<number>`sum(${ledger_entries.amount})`,
    })
    .from(ledger_entries)
    .innerJoin(
      ledger_accounts,
      eq(ledger_entries.account_id, ledger_accounts.id),
    )
    .where(
      sql`${ledger_accounts.user_id} = ${userId} and ${ledger_accounts.kind} = 'asset'`,
    )
    .groupBy(ledger_accounts.id);
  return new Map(
    rows.map((row) => [
      accountRefId({ kind: row.kind, key: row.key, currency: row.currency }),
      row.total,
    ]),
  );
}

async function storedUnbalancedCount(userId: string): Promise<number> {
  const rows = await db
    .select({ transactionId: ledger_entries.transaction_id })
    .from(ledger_entries)
    .innerJoin(
      ledger_accounts,
      eq(ledger_entries.account_id, ledger_accounts.id),
    )
    .where(eq(ledger_entries.user_id, userId))
    .groupBy(ledger_entries.transaction_id, ledger_accounts.currency)
    .having(sql`sum(${ledger_entries.amount}) <> 0`);
  return rows.length;
}

async function legacyRowsOf(userId: string) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.user_id, userId))
    .orderBy(asc(transactions.occurred_at), asc(transactions.id));
}

async function migrateUser(userId: string, scaleOf: ScaleOf): Promise<boolean> {
  console.log(`user ${userId}`);
  const rows = await legacyRowsOf(userId);
  const plan = planLedgerMigration(rows, scaleOf);
  const expected = legacyAssetBalances(rows, scaleOf);
  printPlan(plan, rows.length);
  const planMismatches = balanceMismatches(
    expected,
    plannedAssetBalances(plan),
  );
  printMismatches("plan", planMismatches);
  const blocked = plan.review.some((item) =>
    BLOCKING_REVIEW_REASONS.has(item.reason),
  );
  if (!apply) return planMismatches.length === 0 && !blocked;
  if (planMismatches.length > 0 || blocked) {
    console.log(
      "  skipped: plan does not preserve balances or loses precision",
    );
    return false;
  }

  const existing = await ledgerTransactionCount(userId);
  if (existing > 0 && !reset) {
    console.log(
      `  skipped: ${existing} ledger transactions already exist (pass --reset to rebuild)`,
    );
    return false;
  }
  if (existing > 0) {
    const nonLegacy = await nonLegacyEntryCount(userId);
    if (nonLegacy > 0) {
      console.log(
        `  skipped: ${nonLegacy} ledger entries were written by the app after cutover, reset would destroy them`,
      );
      return false;
    }
  }

  const labels = await getAccountLabels(userId);
  const { accountRows, accountIds } = accountRowsOf(userId, plan, labels);
  await db.transaction(async (tx) => {
    if (existing > 0) await clearLedger(tx, userId);
    await writeAccounts(tx, accountRows);
  });
  const batches = chunks(plan.transactions);
  for (const [index, batch] of batches.entries()) {
    try {
      await db.transaction((tx) =>
        writeTransactions(tx, userId, batch, accountIds),
      );
    } catch (error) {
      console.log(
        `  partial: batch ${index + 1}/${batches.length} failed, rerun with --apply --reset`,
      );
      throw error;
    }
  }

  const current = await legacyRowsOf(userId);
  if (current.length !== rows.length) {
    console.log(
      `  legacy rows changed during apply: ${rows.length} planned, ${current.length} now`,
    );
  }
  const storedMismatches = balanceMismatches(
    legacyAssetBalances(current, scaleOf),
    await storedAssetBalances(userId),
  );
  printMismatches("stored", storedMismatches);
  const unbalanced = await storedUnbalancedCount(userId);
  console.log(`  stored transactions not summing to zero: ${unbalanced}`);
  return storedMismatches.length === 0 && unbalanced === 0;
}

async function migrateUserSafely(
  userId: string,
  scaleOf: ScaleOf,
): Promise<boolean> {
  try {
    return await migrateUser(userId, scaleOf);
  } catch (error) {
    console.log(`  failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function main() {
  if (onlyUser === "") {
    console.log("--user= needs a user id");
    process.exitCode = 1;
    return;
  }
  const userIds = onlyUser
    ? [onlyUser]
    : (
        await db.selectDistinct({ id: transactions.user_id }).from(transactions)
      ).map((row) => row.id);
  console.log(
    `${apply ? "APPLY" : "DRY RUN"}${reset ? " with reset" : ""}: ${userIds.length} users`,
  );
  const scaleOf = scaleResolver(
    await db
      .select({ code: crypto_assets.code, scale: crypto_assets.scale })
      .from(crypto_assets),
  );
  let failed = 0;
  for (const userId of userIds) {
    if (!(await migrateUserSafely(userId, scaleOf))) failed += 1;
  }
  console.log(failed === 0 ? "OK" : `${failed} users need attention`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
