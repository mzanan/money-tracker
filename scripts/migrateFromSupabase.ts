/**
 * One-shot migration: Supabase Postgres → Turso (libSQL) via Drizzle.
 *
 * Preserves Supabase user UUIDs as Better Auth user.id so transactions /
 * settings / integrations stay linked after the swap.
 *
 * Required env:
 *   SUPABASE_URL                    (from your existing .env)
 *   SUPABASE_SERVICE_ROLE_KEY       (Supabase dashboard → Settings → API)
 *   TURSO_DATABASE_URL              (e.g. libsql://money-tracker-zanan.turso.io)
 *   TURSO_AUTH_TOKEN                (from `turso db tokens create`)
 *
 * Run:  npm run migrate:fromSupabase
 *
 * Idempotent: re-running upserts on user_id / id, so a failed partial run can
 * be re-attempted. Passwords are NOT migrated — Supabase hashes are not
 * compatible with Better Auth's scheme. Sign in via the OTP flow after migrating.
 */
import { config } from "dotenv";

// Load .env.local first (Next.js convention) then fall back to .env
config({ path: ".env.local" });
config();

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createLibsqlClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "../src/lib/db/schema";

const SUPABASE_URL = required("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
const TURSO_DATABASE_URL = required("TURSO_DATABASE_URL");
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const libsql = createLibsqlClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});
const db = drizzle(libsql, { schema });

async function main() {
  console.log("→ Migrating users…");
  const { data: usersList, error: usersError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw usersError;
  const users = usersList.users;
  console.log(`  found ${users.length} user(s)`);

  for (const u of users) {
    if (!u.email) {
      console.warn(`  skipping user ${u.id} — no email`);
      continue;
    }
    await db
      .insert(schema.user)
      .values({
        id: u.id,
        email: u.email,
        name: (u.user_metadata?.name as string | undefined) ?? null,
        emailVerified: u.email_confirmed_at !== null,
        image: (u.user_metadata?.avatar_url as string | undefined) ?? null,
        createdAt: new Date(u.created_at),
        updatedAt: new Date(u.updated_at ?? u.created_at),
      })
      .onConflictDoNothing();
    console.log(`  ✓ ${u.email}`);
  }

  console.log("→ Migrating user_settings…");
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("*");
  if (settingsError) throw settingsError;
  for (const s of settings ?? []) {
    await db
      .insert(schema.user_settings)
      .values({
        user_id: s.user_id,
        currencies: s.currencies,
        base_currency: s.base_currency,
        timezone: s.timezone,
        onboarded_at: s.onboarded_at,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })
      .onConflictDoUpdate({
        target: schema.user_settings.user_id,
        set: {
          currencies: s.currencies,
          base_currency: s.base_currency,
          timezone: s.timezone,
          onboarded_at: s.onboarded_at,
        },
      });
  }
  console.log(`  migrated ${settings?.length ?? 0} row(s)`);

  console.log("→ Migrating transactions…");
  const pageSize = 1000;
  let from = 0;
  let total = 0;
  for (;;) {
    const { data: txs, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (txError) throw txError;
    if (!txs || txs.length === 0) break;

    const rows = txs.map((t) => ({
      id: t.id,
      user_id: t.user_id,
      kind: t.kind as "income" | "expense",
      amount_original: Number(t.amount_original),
      currency_original: t.currency_original,
      fx_rates_snapshot: t.fx_rates_snapshot,
      category: t.category,
      note: t.note,
      occurred_on: t.occurred_on,
      occurred_at: t.occurred_at,
      source: t.source ?? "manual",
      external_id: t.external_id ?? null,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
    await db.insert(schema.transactions).values(rows).onConflictDoNothing();
    total += rows.length;
    from += pageSize;
    if (txs.length < pageSize) break;
  }
  console.log(`  migrated ${total} row(s)`);

  console.log("→ Migrating api_integrations…");
  const { data: integrations, error: intError } = await supabase
    .from("api_integrations")
    .select("*");
  if (intError) throw intError;
  for (const i of integrations ?? []) {
    await db
      .insert(schema.api_integrations)
      .values({
        user_id: i.user_id,
        provider: i.provider,
        api_key: i.api_key,
        api_secret: i.api_secret,
        extra: i.extra ?? {},
        import_income: i.import_income,
        last_synced_at: i.last_synced_at,
        created_at: i.created_at,
        updated_at: i.updated_at,
      })
      .onConflictDoNothing();
  }
  console.log(`  migrated ${integrations?.length ?? 0} row(s)`);

  console.log("→ Migrating fx_rates_cache…");
  const { data: rates, error: ratesError } = await supabase
    .from("fx_rates_cache")
    .select("*");
  if (ratesError) throw ratesError;
  for (const r of rates ?? []) {
    await db
      .insert(schema.fx_rates_cache)
      .values({
        base: r.base,
        rates: r.rates,
        fetched_at: r.fetched_at,
        provider_updated_at: r.provider_updated_at,
        next_update_at: r.next_update_at,
      })
      .onConflictDoUpdate({
        target: schema.fx_rates_cache.base,
        set: {
          rates: r.rates,
          fetched_at: r.fetched_at,
          provider_updated_at: r.provider_updated_at,
          next_update_at: r.next_update_at,
        },
      });
  }
  console.log(`  migrated ${rates?.length ?? 0} row(s)`);

  console.log("\n✓ Migration complete. Next:");
  console.log("  1. Sign in to the app via OTP (passwords were not migrated)");
  console.log("  2. Verify all months render correctly");
  console.log(
    "  3. Once happy: npm uninstall @supabase/supabase-js @supabase/ssr",
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
