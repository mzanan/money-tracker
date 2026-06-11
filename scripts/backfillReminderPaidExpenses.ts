import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient as createLibsqlClient } from "@libsql/client";
import { addDays, format, subDays } from "date-fns";
import { and, between, eq, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "../src/lib/db/schema";
import { fetchRatesFromProvider } from "../src/lib/rates";
import { buildTransactionRow } from "../src/lib/transactions";

const TURSO_DATABASE_URL = required("TURSO_DATABASE_URL");
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const APPLY = process.argv.includes("--apply");
const WINDOW_DAYS = 2;
const AMOUNT_TOLERANCE = 0.01;

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

const { recurring_payments, transactions, user_settings } = schema;

async function main() {
  const { rates } = await fetchRatesFromProvider();

  const reminders = await db
    .select()
    .from(recurring_payments)
    .where(isNotNull(recurring_payments.last_paid_on));

  let created = 0;
  for (const reminder of reminders) {
    const day = reminder.last_paid_on as string;
    if (reminder.amount == null || !reminder.currency) {
      console.log(`skip (no amount/currency): ${reminder.label}`);
      continue;
    }

    const windowCenter = new Date(`${day}T00:00:00Z`);
    const start = format(subDays(windowCenter, WINDOW_DAYS), "yyyy-MM-dd");
    const end = format(addDays(windowCenter, WINDOW_DAYS), "yyyy-MM-dd");

    const existing = await db
      .select({ id: transactions.id, source: transactions.source })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, reminder.user_id),
          eq(transactions.kind, "expense"),
          eq(transactions.currency_original, reminder.currency),
          between(transactions.occurred_on, start, end),
          sql`abs(${transactions.amount_original} - ${reminder.amount}) <= ${AMOUNT_TOLERANCE}`,
        ),
      );
    if (existing.length > 0) {
      console.log(
        `skip (already covered by ${existing[0].source}): ${reminder.label} on ${day}`,
      );
      continue;
    }

    const settings = await db
      .select({ currencies: user_settings.currencies })
      .from(user_settings)
      .where(eq(user_settings.user_id, reminder.user_id))
      .limit(1)
      .then((rows) => rows[0]);

    const row = buildTransactionRow(
      {
        userId: reminder.user_id,
        kind: "expense",
        amount: reminder.amount,
        currency: reminder.currency,
        occurredOn: day,
        category: reminder.category,
        note: reminder.label,
        externalId: `reminder:${reminder.id}:${day}`,
      },
      { rates, userCurrencies: settings?.currencies ?? [] },
    );
    if (!row) {
      console.log(`skip (no rate for ${reminder.currency}): ${reminder.label}`);
      continue;
    }

    console.log(
      `${APPLY ? "insert" : "would insert"}: ${reminder.label} ${reminder.amount} ${reminder.currency} on ${day}`,
    );
    if (APPLY) {
      await db
        .insert(transactions)
        .values(row)
        .onConflictDoNothing({
          target: [
            transactions.user_id,
            transactions.source,
            transactions.external_id,
          ],
        });
      created += 1;
    }
  }

  console.log(APPLY ? `done: ${created} inserted` : "dry run: nothing written");
}

main().then(() => process.exit(0));
