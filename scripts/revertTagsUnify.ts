import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient as createLibsqlClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "../src/lib/db/schema";
import { canonicalTag, tagKey } from "../src/lib/tags";

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
  console.log(`[revert-tags] mode = ${APPLY ? "APPLY" : "dry-run"}\n`);

  const all = await db.select().from(transactions);
  let changed = 0;

  for (const tx of all) {
    const drop = new Set<string>();
    if (tx.note) drop.add(tagKey(canonicalTag(tx.note)));
    if (tx.comment) drop.add(tagKey(canonicalTag(tx.comment)));
    if (drop.size === 0) continue;

    const filtered = tx.tags.filter((t) => !drop.has(tagKey(t)));
    if (filtered.length === tx.tags.length) continue;

    changed++;
    console.log(
      `  ${tx.id.slice(0, 8)} ${tx.source.padEnd(8)} [${tx.tags.join(", ")}] -> [${filtered.join(", ")}]`,
    );
    if (APPLY) {
      await db
        .update(transactions)
        .set({ tags: filtered })
        .where(eq(transactions.id, tx.id));
    }
  }

  console.log(
    `\n[revert-tags] ${changed} of ${all.length} rows ${APPLY ? "reverted" : "would revert"}`,
  );
  if (!APPLY) console.log(`\n  re-run with --apply to persist.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
