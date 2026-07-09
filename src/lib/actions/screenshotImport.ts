"use server";

import { and, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isSupportedCurrency } from "@/config/currencies";
import { roundForCurrency } from "@/lib/currency";
import { daysBefore, todayInTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { transactions, user_settings } from "@/lib/db/schema";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";
import {
  buildTransactionRow,
  transactionContentHash,
} from "@/lib/transactions";

import type { ActionResult } from "./transactions";

const SHARE_COOKIE = "mt_share_payload";

export async function clearSharePayload(): Promise<void> {
  const jar = await cookies();
  jar.delete(SHARE_COOKIE);
}

export interface ScreenshotRow {
  id: string;
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string | null;
  description: string | null;
  source: string;
  replaceId: string | null;
}

export type ScreenshotRowStatus =
  | "imported"
  | "duplicate"
  | "invalid_currency"
  | "invalid_amount"
  | "invalid_date"
  | "invalid_source"
  | "failed";

export interface ScreenshotRowResult {
  id: string;
  status: ScreenshotRowStatus;
}

async function nextExternalId(
  userId: string,
  source: string,
  baseHash: string,
): Promise<string> {
  const prefix = `ss:${baseHash}`;
  const rows = await db
    .select({ external_id: transactions.external_id })
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, userId),
        eq(transactions.source, source),
        like(transactions.external_id, `${prefix}%`),
      ),
    );

  if (rows.length === 0) return prefix;

  const taken = new Set(rows.map((r) => r.external_id));
  let i = 1;
  while (taken.has(`${prefix}:${i}`)) i++;
  return `${prefix}:${i}`;
}

const SOURCE_RE = /^[a-z0-9][a-z0-9 &_-]{0,31}$/;
const RESERVED_SOURCES = new Set(["all"]);

function normalizeSource(raw: string): string | null {
  const source = raw.trim().toLowerCase();
  if (!SOURCE_RE.test(source) || RESERVED_SOURCES.has(source)) return null;
  return source;
}

export async function importScreenshotRows(input: {
  rows: ScreenshotRow[];
}): Promise<
  ActionResult<{ imported: number; results: ScreenshotRowResult[] }>
> {
  if (input.rows.length === 0) {
    return { ok: false, error: "Nothing selected" };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const settings = await db
    .select({
      currencies: user_settings.currencies,
      timezone: user_settings.timezone,
    })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);
  if (!settings) return { ok: false, error: "Settings not found" };

  let rates;
  try {
    rates = (await getRates()).rates;
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return {
        ok: false,
        error: "Exchange rates unavailable. Try again in a bit.",
      };
    }
    return { ok: false, error: "Error fetching rates" };
  }

  const today = todayInTz(settings.timezone ?? "UTC");
  const oldestPlausible = daysBefore(today, 365);

  let imported = 0;
  const results: ScreenshotRowResult[] = [];

  for (const row of input.rows) {
    const source = normalizeSource(row.source);
    if (!source) {
      results.push({ id: row.id, status: "invalid_source" });
      continue;
    }
    if (!isSupportedCurrency(row.currency) && !rates[row.currency]) {
      results.push({ id: row.id, status: "invalid_currency" });
      continue;
    }
    const amount = roundForCurrency(row.amount, row.currency);
    if (!Number.isFinite(amount) || amount <= 0) {
      results.push({ id: row.id, status: "invalid_amount" });
      continue;
    }
    let occurredOn = row.occurredOn ?? today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      results.push({ id: row.id, status: "invalid_date" });
      continue;
    }
    if (occurredOn > today || occurredOn < oldestPlausible) occurredOn = today;

    const baseHash = transactionContentHash({
      occurredOn,
      amount,
      currency: row.currency,
      description: row.description,
      kind: row.kind,
    }).slice(0, 24);
    const externalId = await nextExternalId(user.id, source, baseHash);

    const built = buildTransactionRow(
      {
        userId: user.id,
        kind: row.kind,
        amount,
        currency: row.currency,
        occurredOn,
        note: row.description,
        source,
        externalId,
      },
      { rates, userCurrencies: settings.currencies },
    );
    if (!built) {
      results.push({ id: row.id, status: "invalid_currency" });
      continue;
    }

    try {
      const inserted = await db
        .insert(transactions)
        .values(built)
        .onConflictDoNothing({
          target: [
            transactions.user_id,
            transactions.source,
            transactions.external_id,
          ],
        })
        .returning({ id: transactions.id });

      if (inserted.length === 0) {
        results.push({ id: row.id, status: "duplicate" });
        continue;
      }

      imported += 1;
      results.push({ id: row.id, status: "imported" });
      if (row.replaceId) {
        await db
          .delete(transactions)
          .where(
            and(
              eq(transactions.user_id, user.id),
              eq(transactions.id, row.replaceId),
            ),
          );
      }
    } catch {
      results.push({ id: row.id, status: "failed" });
    }
  }

  if (imported > 0) {
    revalidatePath("/", "layout");
  }

  return { ok: true, data: { imported, results } };
}

export async function previewCandidatesAction(
  rows: Array<{
    occurredOn: string | null;
    amount: number;
    currency: string;
    kind: "income" | "expense";
  }>,
): Promise<
  ActionResult<{
    candidates: Array<{
      index: number;
      matches: Array<{
        id: string;
        source: string;
        occurredOn: string;
        amount: number;
        currency: string;
        kind: "income" | "expense";
        note: string | null;
      }>;
    }>;
  }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const settings = await db
    .select({ timezone: user_settings.timezone })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);
  const today = todayInTz(settings?.timezone ?? "UTC");

  const { findCrossSourceCandidates } = await import("@/lib/data/duplicates");
  const queries = rows.map((row) => ({
    userId: user.id,
    occurredOn: row.occurredOn ?? today,
    amount: row.amount,
    currency: row.currency,
    kind: row.kind,
  }));
  const rates = await getRates()
    .then((r) => r.rates)
    .catch(() => null);
  const result = await findCrossSourceCandidates(queries, rates);

  return {
    ok: true,
    data: {
      candidates: result.map((entry, index) => ({
        index,
        matches: entry.matches.map((m) => ({
          id: m.id,
          source: m.source,
          occurredOn: m.occurred_on,
          amount: m.amount_original,
          currency: m.currency_original,
          kind: m.kind,
          note: m.note,
        })),
      })),
    },
  };
}

