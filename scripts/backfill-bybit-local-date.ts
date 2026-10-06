import { createClient } from "@libsql/client";
import { config } from "dotenv";

import { dateInTz } from "../src/lib/dates";

config({ path: ".env.local" });
config();

const apply = process.argv.includes("--apply");

interface Row {
  id: string;
  user_id: string;
  occurred_on: string;
  occurred_at: string;
  timezone: string | null;
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const result = await client.execute(
    `SELECT t.id, t.user_id, t.occurred_on, t.occurred_at, s.timezone
     FROM transactions t
     LEFT JOIN user_settings s ON s.user_id = t.user_id
     WHERE t.source = 'bybit' AND t.occurred_at IS NOT NULL`,
  );
  const rows = result.rows as unknown as Row[];

  const changes = rows
    .map((row) => ({
      ...row,
      next: dateInTz(row.occurred_at, row.timezone ?? "UTC"),
    }))
    .filter(
      (row) =>
        row.occurred_on === row.occurred_at.slice(0, 10) &&
        row.next !== row.occurred_on,
    );

  console.log(
    `${url.split("//")[1]?.split(".")[0]}: ${rows.length} bybit rows, ${changes.length} to move`,
  );
  for (const row of changes.slice(0, 20)) {
    console.log(
      `  ${row.user_id.slice(0, 8)} ${row.occurred_at} ${row.occurred_on} -> ${row.next}`,
    );
  }

  if (!apply || changes.length === 0) return;

  await client.batch(
    changes.map((row) => ({
      sql: "UPDATE transactions SET occurred_on = ? WHERE id = ? AND user_id = ?",
      args: [row.next, row.id, row.user_id],
    })),
    "write",
  );
  console.log(`Updated ${changes.length} rows`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
