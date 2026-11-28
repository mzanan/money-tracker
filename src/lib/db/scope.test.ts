import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@libsql/client";
import { eq, getTableColumns, getTableName, is } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "./schema";
import { forUser, shared, SHARED_TABLES, TENANT_TABLES } from "./scope";

const dir = mkdtempSync(join(tmpdir(), "money-tracker-scope-"));
const url = `file:${join(dir, "test.db")}`;
process.env.TURSO_DATABASE_URL = url;
delete process.env.TURSO_EMBEDDED_REPLICA_PATH;
delete process.env.TURSO_AUTH_TOKEN;

const A = "user-a";
const B = "user-b";
const AUTH_TABLES = ["user", "session", "account", "verification"];
const TODAY = "2026-11-28";

async function seedUser(userId: string, marker: string) {
  const scope = forUser(userId);
  const accountId = `${marker}-asset`;
  const counterId = `${marker}-expense`;
  const transactionId = `${marker}-tx`;
  await scope.insert(schema.user_settings, {
    base_currency: "USD",
    currencies: ["USD"],
    fixed_labels: [],
    archived_sources: [],
  });
  await scope.insert(schema.ledger_accounts, [
    { id: accountId, kind: "asset", key: "wise", name: `${marker} wise`, currency: "USD" },
    { id: counterId, kind: "expense", key: "food", name: `${marker} food`, currency: "USD" },
  ]);
  await scope.insert(schema.ledger_transactions, {
    id: transactionId,
    occurred_on: "2026-11-01",
    occurred_at: "2026-11-01T00:00:00.000Z",
    note: `${marker} lunch`,
  });
  await scope.insert(schema.ledger_entries, [
    {
      transaction_id: transactionId,
      account_id: accountId,
      currency: "USD",
      role: "amount",
      amount: -1000,
      occurred_on: "2026-11-01",
    },
    {
      transaction_id: transactionId,
      account_id: counterId,
      currency: "USD",
      role: "amount",
      amount: 1000,
      occurred_on: "2026-11-01",
    },
  ]);
  await scope.insert(schema.ledger_external_ids, {
    transaction_id: transactionId,
    origin: "wise",
    external_id: `${marker}-ext`,
  });
  await scope.insert(schema.recurring_payments, {
    id: `${marker}-reminder`,
    label: `${marker} rent`,
    frequency: "MONTHLY",
    next_due_on: "2026-12-01",
  });
}

async function seedExtraAsset(userId: string) {
  const scope = forUser(userId);
  await scope.insert(schema.ledger_accounts, {
    id: "LEAK_B-bank",
    kind: "asset",
    key: "leakbank",
    name: "LEAK_B bank",
    currency: "EUR",
  });
  await scope.insert(schema.ledger_transactions, {
    id: "LEAK_B-bank-tx",
    occurred_on: "2026-11-02",
    occurred_at: "2026-11-02T00:00:00.000Z",
    note: "LEAK_B deposit",
  });
  await scope.insert(schema.ledger_entries, {
    transaction_id: "LEAK_B-bank-tx",
    account_id: "LEAK_B-bank",
    currency: "EUR",
    role: "amount",
    amount: 500,
    occurred_on: "2026-11-02",
  });
}

beforeAll(async () => {
  const client = createClient({ url });
  const raw = drizzle(client, { schema });
  await migrate(raw, { migrationsFolder: "drizzle/migrations" });
  const now = new Date();
  for (const id of [A, B]) {
    await raw.insert(schema.user).values({
      id,
      email: `${id}@test.local`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  client.close();
  await seedUser(A, "MARK_A");
  await seedUser(B, "LEAK_B");
  await seedExtraAsset(B);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("table registry", () => {
  it("lists every table with a user_id column as a tenant table", () => {
    const tables = Object.values(schema).filter((value) =>
      is(value, SQLiteTable),
    );
    const tenant = new Set<unknown>(TENANT_TABLES);
    const sharedSet = new Set<unknown>(SHARED_TABLES);
    for (const table of tables) {
      const name = getTableName(table);
      const hasOwner = "user_id" in getTableColumns(table);
      if (hasOwner) expect(tenant.has(table), name).toBe(true);
      else
        expect(sharedSet.has(table) || AUTH_TABLES.includes(name), name).toBe(
          true,
        );
    }
  });
});

describe("forUser query shape", () => {
  it.each(TENANT_TABLES.map((table) => [getTableName(table), table] as const))(
    "%s filters every read and delete by owner",
    (_, table) => {
      const scope = forUser(A);
      const fields = { owner: table.user_id };
      for (const query of [
        scope.selectFrom(table).toSQL(),
        scope.select(fields).from(table).toSQL(),
        scope.selectDistinct(fields).from(table).toSQL(),
        scope.delete(table).toSQL(),
      ]) {
        expect(query.sql).toMatch(/"user_id" = \?/);
        expect(query.params).toContain(A);
      }
    },
  );

  it("filters updates by owner and sets the owner on inserts", () => {
    const scope = forUser(A);
    const update = scope
      .update(schema.recurring_payments, { label: "x" })
      .toSQL();
    const insert = scope
      .insert(schema.recurring_payments, {
        label: "x",
        frequency: "MONTHLY",
        next_due_on: "2026-12-01",
      })
      .toSQL();
    expect(update.sql).toMatch(/where "recurring_payments"."user_id" = \?/);
    expect(update.params).toContain(A);
    expect(insert.params).toContain(A);
  });

  it("adds the owner filter to every joined per-user table", () => {
    const scope = forUser(A);
    const query = scope
      .select({ amount: schema.ledger_entries.amount })
      .from(schema.ledger_accounts)
      .orderBy(schema.ledger_accounts.key)
      .innerJoin(
        schema.ledger_entries,
        eq(schema.ledger_entries.account_id, schema.ledger_accounts.id),
      )
      .toSQL();
    expect(query.sql).toMatch(/"ledger_accounts"."user_id" = \?/);
    expect(query.sql).toMatch(/"ledger_entries"."user_id" = \?/);
  });

  it("refuses the escapes that would drop or move ownership", () => {
    const scope = forUser(A);
    const ownerChange = { user_id: B } as unknown as { label: string };
    expect(() => scope.selectFrom(schema.accounts).$dynamic()).toThrow();
    expect(() =>
      scope.update(schema.recurring_payments, ownerChange),
    ).toThrow();
    expect(() =>
      scope
        .insert(schema.recurring_payments, {
          label: "x",
          frequency: "MONTHLY",
          next_due_on: "2026-12-01",
        })
        .onConflictDoUpdate({
          target: schema.recurring_payments.id,
          set: ownerChange,
        }),
    ).toThrow();
    expect(() =>
      shared()
        .select({ date: schema.fx_rates_daily.date })
        .from(schema.fx_rates_daily)
        .innerJoin(
          schema.accounts,
          eq(schema.accounts.source, schema.fx_rates_daily.date),
        ),
    ).toThrow();
  });

  it("rejects an empty user id", () => {
    expect(() => forUser("")).toThrow();
  });
});

describe("two-user leakage", () => {
  it("returns only the caller's rows from the data layer", async () => {
    const { getLedgerData } = await import("@/lib/data/ledgerMovements");
    const { getActiveReminders } = await import("@/lib/data/reminders");
    const { getUserSettings } = await import("@/lib/data/userSettings");
    const { getSourceTransactionIds, getSuggestedAccountCurrencies } =
      await import("@/lib/data/sources");
    const { getLedgerRecordsBetween } = await import(
      "@/lib/data/ledgerWrites"
    );
    const results = await Promise.all([
      getLedgerData(A, TODAY),
      getActiveReminders(A),
      getUserSettings(A),
      getSourceTransactionIds(A, "wise"),
      getSuggestedAccountCurrencies(A),
      getLedgerRecordsBetween(A, "2026-01-01", "2026-12-31"),
    ]);
    const text = JSON.stringify(results);
    expect(text).toContain("MARK_A");
    expect(text).not.toContain("LEAK_B");
    expect(text).not.toContain("leakbank");
    expect(text).not.toContain(B);
  });

  it("does not find another user's external ids or balances", async () => {
    const { existingExternalIds, sourceBalanceMinor } = await import(
      "@/lib/data/ledgerWrites"
    );
    const found = await existingExternalIds(A, "wise", [
      "MARK_A-ext",
      "LEAK_B-ext",
    ]);
    expect([...found]).toEqual(["MARK_A-ext"]);
    expect(await sourceBalanceMinor(A, "wise", "USD")).toBe(-1000);
  });

  it("cannot update or delete another user's rows", async () => {
    const scope = forUser(A);
    const updated = await scope
      .update(
        schema.recurring_payments,
        { label: "hijacked" },
        eq(schema.recurring_payments.id, "LEAK_B-reminder"),
      )
      .returning({ id: schema.recurring_payments.id });
    const deleted = await scope
      .delete(
        schema.ledger_transactions,
        eq(schema.ledger_transactions.id, "LEAK_B-tx"),
      )
      .returning({ id: schema.ledger_transactions.id });
    expect(updated).toEqual([]);
    expect(deleted).toEqual([]);
    const victim = forUser(B);
    const [reminder] = await victim.selectFrom(
      schema.recurring_payments,
      eq(schema.recurring_payments.id, "LEAK_B-reminder"),
    );
    const transactions = await victim.selectFrom(
      schema.ledger_transactions,
      eq(schema.ledger_transactions.id, "LEAK_B-tx"),
    );
    expect(reminder.label).toBe("LEAK_B rent");
    expect(transactions).toHaveLength(1);
  });
});
