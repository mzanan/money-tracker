import { sql } from "drizzle-orm";
import {
  check,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type { FxRates } from "@/types/db";

// ---------------------------------------------------------------------------
// Better Auth tables. Column names match Better Auth's Drizzle adapter
// expectations (camelCase). Do not snake_case these.
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

// ---------------------------------------------------------------------------
// App tables. Columns kept snake_case to match the Transaction / UserSettings
// shape the rest of the codebase already uses. Money amounts are stored as
// REAL (double) — fine for personal-finance precision (15-17 sig digits).
// ---------------------------------------------------------------------------

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["income", "expense"] }).notNull(),
    amount_original: real("amount_original").notNull(),
    currency_original: text("currency_original").notNull(),
    fx_rates_snapshot: text("fx_rates_snapshot", { mode: "json" })
      .$type<FxRates>()
      .notNull(),
    category: text("category"),
    note: text("note"),
    comment: text("comment"),
    occurred_on: text("occurred_on").notNull(),
    occurred_at: text("occurred_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    source: text("source").notNull().default("manual"),
    external_id: text("external_id"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$onUpdate(() => new Date().toISOString()),
  },
  (t) => [
    check("transactions_kind_check", sql`${t.kind} IN ('income', 'expense')`),
    check("transactions_amount_positive", sql`${t.amount_original} > 0`),
    uniqueIndex("transactions_source_external_uniq").on(
      t.user_id,
      t.source,
      t.external_id,
    ),
  ],
);

export const user_settings = sqliteTable(
  "user_settings",
  {
    user_id: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    // currencies is a JSON-encoded string[] in storage; reads/writes are typed
    // as string[] via Drizzle's json mode.
    currencies: text("currencies", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    base_currency: text("base_currency").notNull(),
    timezone: text("timezone"),
    cash_enabled: integer("cash_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    ingest_token: text("ingest_token"),
    calendar_token: text("calendar_token"),
    onboarded_at: text("onboarded_at"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$onUpdate(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex("user_settings_ingest_token_uniq").on(t.ingest_token),
    uniqueIndex("user_settings_calendar_token_uniq").on(t.calendar_token),
  ],
);

export const fx_rates_cache = sqliteTable("fx_rates_cache", {
  base: text("base").primaryKey(),
  rates: text("rates", { mode: "json" }).$type<FxRates>().notNull(),
  fetched_at: text("fetched_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  provider_updated_at: text("provider_updated_at"),
  next_update_at: text("next_update_at"),
});

export const api_integrations = sqliteTable(
  "api_integrations",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["bybit"] }).notNull(),
    api_key: text("api_key").notNull(),
    api_secret: text("api_secret"),
    extra: text("extra", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    import_income: integer("import_income", { mode: "boolean" })
      .notNull()
      .default(false),
    last_synced_at: text("last_synced_at"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$onUpdate(() => new Date().toISOString()),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.provider] })],
);

export const recurring_payments = sqliteTable(
  "recurring_payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    amount: real("amount"),
    currency: text("currency"),
    category: text("category"),
    frequency: text("frequency", {
      enum: ["WEEKLY", "MONTHLY", "YEARLY", "CUSTOM_MONTHS"],
    }).notNull(),
    interval_months: integer("interval_months"),
    last_paid_on: text("last_paid_on"),
    next_due_on: text("next_due_on").notNull(),
    source: text("source"),
    note: text("note"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    created_at: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$onUpdate(() => new Date().toISOString()),
  },
  (t) => [check("recurring_payments_amount_positive", sql`${t.amount} > 0`)],
);
