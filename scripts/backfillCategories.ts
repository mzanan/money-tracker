import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { applyAutoCategories } = await import("../src/lib/categorization");
  const { db, schema } = await import("../src/lib/db");
  const { sql } = await import("drizzle-orm");

  const before = await db
    .select({ id: schema.transactions.id })
    .from(schema.transactions)
    .where(sql`json_array_length(${schema.transactions.tags}) = 0`);
  console.log(`uncategorized before: ${before.length}`);

  const users = await db.select({ id: schema.user.id }).from(schema.user);
  let updated = 0;
  for (const u of users) {
    updated += await applyAutoCategories(u.id);
  }

  console.log(`categorized: ${updated}`);
  console.log(`left uncategorized: ${before.length - updated}`);
}

main().then(() => process.exit(0));
