import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient as createLibsqlClient } from "@libsql/client";
import { and, eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "../src/lib/db/schema";
import { computeNextDue } from "../src/lib/reminders";

const TURSO_DATABASE_URL = required("TURSO_DATABASE_URL");
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const APPLY = process.argv.includes("--apply");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

const client = createLibsqlClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

const { recurring_payments } = schema;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000,
  );
}

async function main() {
  console.log(`[backfill] mode = ${APPLY ? "APPLY" : "dry-run"}\n`);

  const candidates = await db
    .select()
    .from(recurring_payments)
    .where(
      and(
        isNotNull(recurring_payments.last_paid_on),
        eq(recurring_payments.active, true),
      ),
    );

  console.log(`[backfill] active reminders with last_paid_on: ${candidates.length}\n`);

  let updated = 0;
  let unchanged = 0;

  for (const r of candidates) {
    const expected = computeNextDue(
      r.last_paid_on!,
      r.frequency,
      r.interval_months,
    );

    if (expected === r.next_due_on) {
      unchanged++;
      continue;
    }

    const driftDays = daysBetween(r.next_due_on, expected);
    console.log(
      `  → "${r.label}" (${r.frequency}${r.interval_months ? `/${r.interval_months}mo` : ""}): ${r.next_due_on} → ${expected} (${driftDays > 0 ? "+" : ""}${driftDays}d)`,
    );

    if (APPLY) {
      await db
        .update(recurring_payments)
        .set({ next_due_on: expected })
        .where(eq(recurring_payments.id, r.id));
    }
    updated++;
  }

  console.log(`\n[backfill] summary:`);
  console.log(`  ${updated} ${APPLY ? "updated" : "would update"}`);
  console.log(`  ${unchanged} already correct`);
  if (!APPLY) console.log(`\n  re-run with --apply to persist.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
