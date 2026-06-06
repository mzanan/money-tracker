import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient as createLibsqlClient } from "@libsql/client";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "../src/lib/db/schema";

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

const { recurring_payments, transactions } = schema;

async function main() {
  console.log(`[backfill] mode = ${APPLY ? "APPLY" : "dry-run"}\n`);

  const candidates = await db
    .select()
    .from(recurring_payments)
    .where(
      and(
        or(isNull(recurring_payments.note), eq(recurring_payments.note, "")),
        isNotNull(recurring_payments.last_paid_on),
        isNotNull(recurring_payments.source),
      ),
    );

  console.log(`[backfill] candidates without note: ${candidates.length}\n`);

  let filled = 0;
  let noMatch = 0;
  let noComment = 0;
  let conflict = 0;

  for (const r of candidates) {
    const matches = await db
      .select({ comment: transactions.comment, id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, r.user_id),
          eq(transactions.source, r.source!),
          eq(transactions.occurred_on, r.last_paid_on!),
          eq(transactions.currency_original, r.currency ?? ""),
          eq(transactions.amount_original, r.amount ?? 0),
        ),
      );

    if (matches.length === 0) {
      noMatch++;
      console.log(`  ✗ no match for "${r.label}" (${r.source} ${r.amount} ${r.currency} on ${r.last_paid_on})`);
      continue;
    }

    const comments = matches
      .map((m) => m.comment?.trim())
      .filter((c): c is string => Boolean(c));

    if (comments.length === 0) {
      noComment++;
      continue;
    }

    const unique = Array.from(new Set(comments));
    if (unique.length > 1) {
      conflict++;
      console.log(`  ⚠ conflicting comments for "${r.label}": ${JSON.stringify(unique)}`);
      continue;
    }

    const note = unique[0];
    console.log(`  ✓ "${r.label}" → "${note}"`);

    if (APPLY) {
      await db
        .update(recurring_payments)
        .set({ note })
        .where(eq(recurring_payments.id, r.id));
    }
    filled++;
  }

  console.log(`\n[backfill] summary:`);
  console.log(`  ${filled} ${APPLY ? "updated" : "would update"}`);
  console.log(`  ${noMatch} no tx match`);
  console.log(`  ${noComment} tx match without comment`);
  console.log(`  ${conflict} conflicting comments (skipped)`);
  if (!APPLY) console.log(`\n  re-run with --apply to persist.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
