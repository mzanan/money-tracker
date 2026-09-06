import { config } from "dotenv";

config({ path: ".env.local" });
config();

delete process.env.TURSO_EMBEDDED_REPLICA_PATH;

import { and, eq } from "drizzle-orm";

import { db } from "../src/lib/db";
import { transactions } from "../src/lib/db/schema";

import type { FxRates } from "../src/types/db";

const USER_EMAIL_HINT = "test@gmail.com";
const USER_ID = "746f1093-38fe-4a6e-88d9-6466d42b9f49";
const SEED_MARKER = "seed-dev";
const RATES: FxRates = {
  USD: 1,
  VND: 26186.832633,
  EUR: 0.865666,
  USDT: 1.0005,
};

const MONTHS = ["2026-06", "2026-07", "2026-08", "2026-09"] as const;
const LAST_DAY_OF_CURRENT_MONTH = 2;

interface Row {
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string;
  tags: string[];
  note: string;
  source: string;
}

let seedState = 20260902;

function random(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}

function between(min: number, max: number, step = 1): number {
  const span = Math.floor((max - min) / step) + 1;
  return min + Math.floor(random() * span) * step;
}

function daysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function dayOfWeek(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dailyRows(date: string): Row[] {
  const rows: Row[] = [];
  rows.push({
    kind: "expense",
    amount: between(38000, 62000, 1000),
    currency: "VND",
    occurredOn: date,
    tags: ["Coffee"],
    note: "Morning coffee",
    source: "manual",
  });
  rows.push({
    kind: "expense",
    amount: between(55000, 115000, 5000),
    currency: "VND",
    occurredOn: date,
    tags: ["Food"],
    note: "Lunch",
    source: "manual",
  });
  if (random() < 0.65) {
    rows.push({
      kind: "expense",
      amount: between(120000, 290000, 10000),
      currency: "VND",
      occurredOn: date,
      tags: ["Food"],
      note: "Dinner",
      source: "manual",
    });
  }
  if (random() < 0.45) {
    rows.push({
      kind: "expense",
      amount: between(35000, 120000, 5000),
      currency: "VND",
      occurredOn: date,
      tags: ["Transport"],
      note: "Grab ride",
      source: "manual",
    });
  }
  if (dayOfWeek(date) === 6) {
    rows.push({
      kind: "expense",
      amount: between(320000, 690000, 10000),
      currency: "VND",
      occurredOn: date,
      tags: ["Groceries"],
      note: "Weekly groceries",
      source: "wise",
    });
  }
  return rows;
}

function nonDailyRows(yearMonth: string, lastDay: number): Row[] {
  const rows: Row[] = [];
  if (lastDay >= 2) {
    rows.push({
      kind: "expense",
      amount: 650,
      currency: "USD",
      occurredOn: `${yearMonth}-02`,
      tags: ["Rent"],
      note: "Apartment rent",
      source: "wise",
    });
  }
  if (lastDay >= 3) {
    rows.push({
      kind: "expense",
      amount: 1500000,
      currency: "VND",
      occurredOn: `${yearMonth}-03`,
      tags: ["Motorbike"],
      note: "Motorbike monthly rent",
      source: "manual",
    });
  }
  if (lastDay >= 5) {
    rows.push({
      kind: "income",
      amount: 1800,
      currency: "USD",
      occurredOn: `${yearMonth}-05`,
      tags: ["Freelance"],
      note: "Freelance invoice",
      source: "wise",
    });
  }
  return rows;
}

const ONE_OFFS: Row[] = [
  {
    kind: "expense",
    amount: 2400000,
    currency: "VND",
    occurredOn: "2026-06-18",
    tags: ["Health"],
    note: "Medical check-up",
    source: "manual",
  },
  {
    kind: "expense",
    amount: 285,
    currency: "USD",
    occurredOn: "2026-07-09",
    tags: ["Travel"],
    note: "Flight ticket to Bangkok",
    source: "wise",
  },
  {
    kind: "expense",
    amount: 3100000,
    currency: "VND",
    occurredOn: "2026-08-14",
    tags: ["Health"],
    note: "Blood test and specialist visit",
    source: "manual",
  },
  {
    kind: "expense",
    amount: 1900000,
    currency: "VND",
    occurredOn: "2026-08-21",
    tags: ["Tech"],
    note: "Laptop battery replacement",
    source: "manual",
  },
  {
    kind: "expense",
    amount: 340,
    currency: "USD",
    occurredOn: "2026-09-01",
    tags: ["Travel"],
    note: "Flight ticket to Da Nang",
    source: "wise",
  },
];

function buildRows(): Row[] {
  const rows: Row[] = [];
  for (const yearMonth of MONTHS) {
    const isCurrent = yearMonth === "2026-09";
    const lastDay = isCurrent
      ? LAST_DAY_OF_CURRENT_MONTH
      : daysInMonth(yearMonth);
    for (let day = 1; day <= lastDay; day++) {
      rows.push(...dailyRows(`${yearMonth}-${pad(day)}`));
    }
    rows.push(...nonDailyRows(yearMonth, lastDay));
  }
  rows.push(...ONE_OFFS);
  return rows.filter((row) => row.occurredOn <= "2026-09-02");
}

async function clean(): Promise<number> {
  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, USER_ID),
        eq(transactions.comment, SEED_MARKER),
      ),
    );
  if (existing.length > 0) {
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.user_id, USER_ID),
          eq(transactions.comment, SEED_MARKER),
        ),
      );
  }
  return existing.length;
}

async function main() {
  const cleanOnly = process.argv.includes("--clean");
  const apply = process.argv.includes("--apply") || cleanOnly;

  const rows = buildRows();
  console.log(`Target user: ${USER_EMAIL_HINT} (${USER_ID})`);
  console.log(`Rows to insert: ${rows.length}`);

  if (!apply) {
    const byMonth = new Map<string, number>();
    for (const row of rows) {
      const key = row.occurredOn.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    console.log("By month:", Array.from(byMonth.entries()).sort());
    console.log("Dry run. Re-run with --apply to write, --clean to remove.");
    process.exit(0);
  }

  const removed = await clean();
  console.log(`Removed previous seed rows: ${removed}`);
  if (cleanOnly) process.exit(0);

  const values = rows.map((row) => ({
    user_id: USER_ID,
    kind: row.kind,
    amount_original: row.amount,
    currency_original: row.currency,
    fx_rates_snapshot: RATES,
    tags: row.tags,
    note: row.note,
    comment: SEED_MARKER,
    occurred_on: row.occurredOn,
    occurred_at: `${row.occurredOn}T09:00:00.000Z`,
    source: row.source,
  }));

  for (let i = 0; i < values.length; i += 50) {
    await db.insert(transactions).values(values.slice(i, i + 50));
  }
  console.log(`Inserted: ${values.length}`);
  process.exit(0);
}

main();
