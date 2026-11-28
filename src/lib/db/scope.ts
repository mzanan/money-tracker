import { and, Column, eq, is, type SQL } from "drizzle-orm";
import type {
  SelectedFields,
  SQLiteInsertValue,
  SQLiteUpdateSetSource,
} from "drizzle-orm/sqlite-core";

import { db, type DbTx } from "./index";
import {
  accounts,
  api_integrations,
  crypto_assets,
  csv_import_locks,
  fx_rates_cache,
  fx_rates_daily,
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
  ledger_revisions,
  ledger_transactions,
  locations,
  merchant_categories,
  recurring_payments,
  sheet_import_layouts,
  sheet_import_rows,
  sheet_imports,
  transactions,
  usage_events,
  user_settings,
} from "./schema";

type Executor = typeof db | DbTx;

export const TENANT_TABLES = [
  accounts,
  api_integrations,
  csv_import_locks,
  ledger_accounts,
  ledger_entries,
  ledger_external_ids,
  ledger_revisions,
  ledger_transactions,
  locations,
  merchant_categories,
  recurring_payments,
  sheet_import_layouts,
  sheet_import_rows,
  sheet_imports,
  transactions,
  usage_events,
  user_settings,
] as const;

export type TenantTable = (typeof TENANT_TABLES)[number];

export const SHARED_TABLES = [crypto_assets, fx_rates_cache, fx_rates_daily] as const;

export type SharedTable = (typeof SHARED_TABLES)[number];

type OwnedInsert<T extends TenantTable> = Omit<
  SQLiteInsertValue<T>,
  "user_id"
>;

type OwnedSet<T extends TenantTable> = Omit<SQLiteUpdateSetSource<T>, "user_id">;

const JOIN_METHODS = new Set([
  "innerJoin",
  "leftJoin",
  "rightJoin",
  "fullJoin",
  "crossJoin",
]);

function owns(table: TenantTable, userId: string): SQL {
  return eq(table.user_id, userId);
}

function ownerColumn(table: unknown): Column | null {
  if (typeof table !== "object" || table === null) return null;
  const column = (table as Record<string, unknown>).user_id;
  return is(column, Column) ? column : null;
}

function assertNoOwnerChange(set: object) {
  if (Object.hasOwn(set, "user_id")) {
    throw new Error("A scoped write cannot change user_id");
  }
}

function guarded<B extends object>(
  builder: B,
  ownerFilter: (column: Column) => SQL,
): B {
  return new Proxy(builder, {
    get(target, prop) {
      const value: unknown = Reflect.get(target, prop, target);
      if (prop === "$dynamic") {
        throw new Error("Scoped queries cannot be made dynamic");
      }
      if (typeof value !== "function") return value;
      if (typeof prop === "string" && JOIN_METHODS.has(prop)) {
        return (table: unknown, on?: SQL) => {
          const column = ownerColumn(table);
          const condition = column ? and(on, ownerFilter(column)) : on;
          return guarded(value.call(target, table, condition), ownerFilter);
        };
      }
      if (prop === "onConflictDoUpdate") {
        return (config: { set: object }) => {
          assertNoOwnerChange(config.set);
          return guarded(value.call(target, config), ownerFilter);
        };
      }
      return (...args: unknown[]) => {
        const result: unknown = value.apply(target, args);
        return result === target ? guarded(target, ownerFilter) : result;
      };
    },
  });
}

function withOwner<T extends TenantTable>(
  values: OwnedInsert<T>,
  userId: string,
): SQLiteInsertValue<T> {
  return { ...values, user_id: userId } as SQLiteInsertValue<T>;
}

function scopeFor(userId: string, executor: Executor) {
  const scoped = <B extends object>(builder: B) =>
    guarded(builder, (column) => eq(column, userId));
  return {
    userId,
    owns: (table: TenantTable) => owns(table, userId),
    selectFrom: <T extends TenantTable>(table: T, where?: SQL) =>
      scoped(
        executor
          .select()
          .from(table)
          .where(and(owns(table, userId), where)),
      ),
    select: <F extends SelectedFields>(fields: F) => ({
      from: <T extends TenantTable>(table: T, where?: SQL) =>
        scoped(
          executor
            .select(fields)
            .from(table)
            .where(and(owns(table, userId), where)),
        ),
    }),
    selectDistinct: <F extends SelectedFields>(fields: F) => ({
      from: <T extends TenantTable>(table: T, where?: SQL) =>
        scoped(
          executor
            .selectDistinct(fields)
            .from(table)
            .where(and(owns(table, userId), where)),
        ),
    }),
    insert: <T extends TenantTable>(
      table: T,
      values: OwnedInsert<T> | OwnedInsert<T>[],
    ) => {
      const query = executor.insert(table);
      return scoped(
        Array.isArray(values)
          ? query.values(values.map((value) => withOwner(value, userId)))
          : query.values(withOwner(values, userId)),
      );
    },
    update: <T extends TenantTable>(table: T, set: OwnedSet<T>, where?: SQL) => {
      assertNoOwnerChange(set);
      return scoped(
        executor
          .update(table)
          .set(set as SQLiteUpdateSetSource<T>)
          .where(and(owns(table, userId), where)),
      );
    },
    delete: <T extends TenantTable>(table: T, where?: SQL) =>
      scoped(executor.delete(table).where(and(owns(table, userId), where))),
  };
}

export type UserScope = ReturnType<typeof scopeFor> & {
  transaction: <R>(run: (scope: UserScope) => Promise<R>) => Promise<R>;
  atomic: <R>(run: (scope: UserScope) => Promise<R>) => Promise<R>;
};

function buildScope(
  userId: string,
  executor: Executor,
  inTransaction: boolean,
): UserScope {
  const scope: UserScope = {
    ...scopeFor(userId, executor),
    transaction: (run) =>
      executor.transaction((tx) => run(buildScope(userId, tx, true))),
    atomic: (run) => (inTransaction ? run(scope) : scope.transaction(run)),
  };
  return scope;
}

export function forUser(userId: string, executor: Executor = db): UserScope {
  if (!userId) throw new Error("forUser requires a user id");
  return buildScope(userId, executor, executor !== db);
}

export function shared(executor: Executor = db) {
  const unowned = <B extends object>(builder: B) =>
    guarded(builder, () => {
      throw new Error("Join per-user tables through forUser()");
    });
  return {
    selectFrom: <T extends SharedTable>(table: T) =>
      unowned(executor.select().from(table)),
    select: <F extends SelectedFields>(fields: F) => ({
      from: <T extends SharedTable>(table: T) =>
        unowned(executor.select(fields).from(table)),
    }),
    insert: <T extends SharedTable>(table: T) => executor.insert(table),
    update: <T extends SharedTable>(table: T) => executor.update(table),
    delete: <T extends SharedTable>(table: T) => executor.delete(table),
  };
}
