"use server";

import { createHash } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { isSupportedCurrency } from "@/config/currencies";
import { roundForCurrency } from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { transactions, user_settings } from "@/lib/db/schema";
import { sourceForApp } from "@/lib/ingest/notification";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";
import { buildTransactionRow } from "@/lib/transactions";

import type { ActionResult } from "./transactions";

export interface ScreenshotRow {
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string | null;
  description: string | null;
  app: string | null;
  comment: string | null;
}

function hashRow(row: {
  occurredOn: string;
  amount: number;
  currency: string;
  description: string | null;
  kind: string;
}): string {
  const key = [
    row.occurredOn,
    row.amount.toString(),
    row.currency,
    row.description ?? "",
    row.kind,
  ].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
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

export async function importScreenshotRows(input: {
  rows: ScreenshotRow[];
}): Promise<
  ActionResult<{ imported: number; errors: number; bySource: Record<string, number> }>
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

  let errors = 0;
  let imported = 0;
  const bySource: Record<string, number> = {};

  for (const row of input.rows) {
    if (!isSupportedCurrency(row.currency) && !rates[row.currency]) {
      errors += 1;
      continue;
    }
    const amount = roundForCurrency(row.amount, row.currency);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors += 1;
      continue;
    }
    const occurredOn = row.occurredOn ?? today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      errors += 1;
      continue;
    }

    const source = sourceForApp(row.app);
    const baseHash = hashRow({
      occurredOn,
      amount,
      currency: row.currency,
      description: row.description,
      kind: row.kind,
    });
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
      errors += 1;
      continue;
    }

    const insertValues = row.comment?.trim()
      ? { ...built, comment: row.comment.trim() }
      : built;

    try {
      const inserted = await db
        .insert(transactions)
        .values(insertValues)
        .onConflictDoNothing({
          target: [
            transactions.user_id,
            transactions.source,
            transactions.external_id,
          ],
        })
        .returning({ id: transactions.id });

      if (inserted.length > 0) {
        imported += 1;
        bySource[source] = (bySource[source] ?? 0) + 1;
      }
    } catch {
      errors += 1;
    }
  }

  if (imported > 0) revalidatePath("/", "layout");

  return { ok: true, data: { imported, errors, bySource } };
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
  const result = await findCrossSourceCandidates(queries);

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

