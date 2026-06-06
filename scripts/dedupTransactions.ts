import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient as createLibsqlClient } from "@libsql/client";
import { inArray } from "drizzle-orm";
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

const { transactions } = schema;

async function main() {
  console.log(`[dedup] mode = ${APPLY ? "APPLY" : "dry-run"}\n`);

  const all = await db.select().from(transactions);

  const groups = new Map<string, typeof all>();
  for (const t of all) {
    const key = [
      t.user_id,
      t.source,
      t.occurred_on,
      t.amount_original,
      t.currency_original,
      t.kind,
    ].join("|");
    const list = groups.get(key);
    if (list) list.push(t);
    else groups.set(key, [t]);
  }

  const toDelete: string[] = [];
  let groupsWithDupes = 0;

  for (const [key, items] of groups) {
    if (items.length <= 1) continue;
    groupsWithDupes++;

    items.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const keep = items[0];
    const remove = items.slice(1);

    const [, source, occurredOn, amount, currency, kind] = key.split("|");
    console.log(
      `  ${source} · ${occurredOn} · ${kind} ${amount} ${currency}: ${items.length} rows → keep 1, drop ${remove.length}`,
    );
    for (const r of remove) {
      const desc = (r.note ?? "").slice(0, 40);
      console.log(
        `    keep ${keep.id.slice(0, 8)} (${keep.created_at.slice(0, 10)}) "${(keep.note ?? "").slice(0, 40)}"`,
      );
      console.log(
        `    drop ${r.id.slice(0, 8)} (${r.created_at.slice(0, 10)}) "${desc}"`,
      );
      toDelete.push(r.id);
    }
  }

  console.log(`\n[dedup] summary:`);
  console.log(`  ${groupsWithDupes} duplicate groups found`);
  console.log(`  ${toDelete.length} rows ${APPLY ? "deleted" : "would delete"}`);

  if (APPLY && toDelete.length > 0) {
    const BATCH = 200;
    for (let i = 0; i < toDelete.length; i += BATCH) {
      await db
        .delete(transactions)
        .where(inArray(transactions.id, toDelete.slice(i, i + BATCH)));
    }
  } else if (!APPLY) {
    console.log(`\n  re-run with --apply to persist.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
