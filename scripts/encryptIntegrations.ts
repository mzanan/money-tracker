import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const apply = process.argv.includes("--apply");
  const { db, schema } = await import("../src/lib/db");
  const { encryptSecret, isEncrypted } = await import(
    "../src/lib/integrations/crypto"
  );
  const { and, eq } = await import("drizzle-orm");

  const rows = await db.select().from(schema.api_integrations);
  let pending = 0;

  for (const row of rows) {
    const aad = `${row.user_id}:${row.provider}`;
    const patch: { api_key?: string; api_secret?: string } = {};
    if (!isEncrypted(row.api_key)) {
      patch.api_key = encryptSecret(row.api_key, aad);
    }
    if (row.api_secret && !isEncrypted(row.api_secret)) {
      patch.api_secret = encryptSecret(row.api_secret, aad);
    }
    if (Object.keys(patch).length === 0) continue;

    pending += 1;
    console.log(
      `${apply ? "encrypting" : "would encrypt"} ${row.provider} (user ${row.user_id})`,
    );
    if (apply) {
      await db
        .update(schema.api_integrations)
        .set(patch)
        .where(
          and(
            eq(schema.api_integrations.user_id, row.user_id),
            eq(schema.api_integrations.provider, row.provider),
          ),
        );
    }
  }

  console.log(
    `${pending} row(s) ${apply ? "encrypted" : "pending — dry-run, pass --apply"}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
