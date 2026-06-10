"use server";

import { addDays, format, subDays } from "date-fns";
import { and, between, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { isSupportedCurrency } from "@/config/currencies";
import { roundForCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { api_integrations, transactions, user_settings } from "@/lib/db/schema";
import { ADAPTERS } from "@/lib/integrations";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";
import { applyAutoCategories } from "@/lib/categorization";
import { buildTransactionRow } from "@/lib/transactions";
import type { IntegrationProvider } from "@/types/db";

import type { ActionResult } from "./transactions";

const ABSORB_WINDOW_DAYS = 2;
const ABSORB_AMOUNT_TOLERANCE = 0.01;

async function absorbMatching(
  userId: string,
  syncSource: string,
  insertedIds: string[],
): Promise<number> {
  if (insertedIds.length === 0) return 0;

  const inserted = await db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      amount: transactions.amount_original,
      currency: transactions.currency_original,
      occurred_on: transactions.occurred_on,
      note: transactions.note,
      comment: transactions.comment,
    })
    .from(transactions)
    .where(inArray(transactions.id, insertedIds));

  let absorbed = 0;
  for (const row of inserted) {
    const start = format(
      subDays(new Date(`${row.occurred_on}T00:00:00Z`), ABSORB_WINDOW_DAYS),
      "yyyy-MM-dd",
    );
    const end = format(
      addDays(new Date(`${row.occurred_on}T00:00:00Z`), ABSORB_WINDOW_DAYS),
      "yyyy-MM-dd",
    );

    const candidates = await db
      .select({
        id: transactions.id,
        note: transactions.note,
        comment: transactions.comment,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, userId),
          ne(transactions.source, syncSource),
          eq(transactions.kind, row.kind),
          eq(transactions.currency_original, row.currency),
          between(transactions.occurred_on, start, end),
          sql`abs(${transactions.amount_original} - ${row.amount}) <= ${ABSORB_AMOUNT_TOLERANCE}`,
        ),
      );

    if (candidates.length !== 1) continue;

    const match = candidates[0];
    const patch: { comment?: string; note?: string } = {};
    if (!row.comment && match.comment) patch.comment = match.comment;
    if (!row.note && match.note) patch.note = match.note;

    await db.transaction(async (tx) => {
      if (Object.keys(patch).length > 0) {
        await tx
          .update(transactions)
          .set(patch)
          .where(eq(transactions.id, row.id));
      }
      await tx.delete(transactions).where(eq(transactions.id, match.id));
    });

    absorbed += 1;
  }

  return absorbed;
}

const DEFAULT_SINCE_DAYS = 30;

export async function saveIntegration(input: {
  provider: IntegrationProvider;
  apiKey: string;
  apiSecret?: string | null;
  importIncome: boolean;
  extra?: Record<string, unknown>;
  initialSinceDays?: number;
}): Promise<ActionResult> {
  if (!input.apiKey?.trim()) {
    return { ok: false, error: "API key is required" };
  }
  if (input.provider === "bybit" && !input.apiSecret?.trim()) {
    return { ok: false, error: "API secret is required for Bybit" };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const existing = await db
    .select({ provider: api_integrations.provider })
    .from(api_integrations)
    .where(
      and(
        eq(api_integrations.user_id, user.id),
        eq(api_integrations.provider, input.provider),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  // On first connect, seed last_synced_at to (now - initialSinceDays) so the
  // first sync naturally picks up that window. On edit, leave the cursor alone.
  const seedLastSyncedAt =
    !existing && input.initialSinceDays
      ? new Date(
          Date.now() - input.initialSinceDays * 24 * 60 * 60 * 1000,
        ).toISOString()
      : undefined;

  const values = {
    user_id: user.id,
    provider: input.provider,
    api_key: input.apiKey.trim(),
    api_secret: input.apiSecret?.trim() || null,
    import_income: input.importIncome,
    extra: input.extra ?? {},
    ...(seedLastSyncedAt ? { last_synced_at: seedLastSyncedAt } : {}),
  };

  try {
    await db
      .insert(api_integrations)
      .values(values)
      .onConflictDoUpdate({
        target: [api_integrations.user_id, api_integrations.provider],
        set: {
          api_key: values.api_key,
          api_secret: values.api_secret,
          import_income: values.import_income,
          extra: values.extra,
        },
      });
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}

export async function deleteIntegration(
  provider: IntegrationProvider,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await db
      .delete(api_integrations)
      .where(
        and(
          eq(api_integrations.user_id, user.id),
          eq(api_integrations.provider, provider),
        ),
      );
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

export async function syncIntegration(
  provider: IntegrationProvider,
): Promise<ActionResult<{ imported: number; skipped: number; absorbed: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const integration = await db
    .select()
    .from(api_integrations)
    .where(
      and(
        eq(api_integrations.user_id, user.id),
        eq(api_integrations.provider, provider),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!integration) return { ok: false, error: "Integration not connected" };

  const settings = await db
    .select({ currencies: user_settings.currencies })
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

  const since = integration.last_synced_at
    ? new Date(integration.last_synced_at)
    : new Date(Date.now() - DEFAULT_SINCE_DAYS * 24 * 60 * 60 * 1000);

  const adapter = ADAPTERS[provider];
  let normalized;
  try {
    normalized = await adapter.fetchTransactions(
      {
        apiKey: integration.api_key,
        apiSecret: integration.api_secret,
        extra: integration.extra,
      },
      since,
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }

  let skippedNoRate = 0;
  let skippedIncome = 0;
  const rows = [];
  for (const tx of normalized) {
    if (!integration.import_income && tx.kind === "income") {
      skippedIncome += 1;
      continue;
    }
    if (!isSupportedCurrency(tx.currency) && !rates[tx.currency]) {
      skippedNoRate += 1;
      continue;
    }
    const row = buildTransactionRow(
      {
        userId: user.id,
        kind: tx.kind,
        amount: roundForCurrency(tx.amount, tx.currency),
        currency: tx.currency,
        occurredOn: tx.occurredOn,
        occurredAt: tx.occurredAt,
        category: tx.category,
        note: tx.note,
        source: provider,
        externalId: tx.externalId,
      },
      { rates, userCurrencies: settings.currencies },
    );
    if (!row) {
      skippedNoRate += 1;
      continue;
    }
    rows.push(row);
  }

  let imported = 0;
  let absorbed = 0;
  if (rows.length > 0) {
    try {
      const inserted = await db
        .insert(transactions)
        .values(rows)
        .onConflictDoNothing({
          target: [
            transactions.user_id,
            transactions.source,
            transactions.external_id,
          ],
        })
        .returning({ id: transactions.id });
      imported = inserted.length;
      if (inserted.length > 0) {
        absorbed = await absorbMatching(
          user.id,
          provider,
          inserted.map((row) => row.id),
        );
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Insert failed",
      };
    }
  }

  if (normalized.length > 0) {
    await db
      .update(api_integrations)
      .set({ last_synced_at: new Date().toISOString() })
      .where(
        and(
          eq(api_integrations.user_id, user.id),
          eq(api_integrations.provider, provider),
        ),
      );
  }

  if (imported > 0) {
    await applyAutoCategories(user.id).catch(() => {});
  }
  revalidatePath("/", "layout");

  const skipped = normalized.length - imported;
  void skippedIncome;
  void skippedNoRate;
  return { ok: true, data: { imported, skipped, absorbed } };
}
