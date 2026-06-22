"use server";

import { and, between, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { isSupportedCurrency } from "@/config/currencies";
import { roundForCurrency } from "@/lib/currency";
import { dayWindow } from "@/lib/dates";
import { db } from "@/lib/db";
import { api_integrations, transactions, user_settings } from "@/lib/db/schema";
import { ADAPTERS } from "@/lib/integrations";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";
import { applyAutoCategories } from "@/lib/categorization";
import { buildTransactionRow } from "@/lib/transactions";
import type { ApiIntegrationUpdate, IntegrationProvider } from "@/types/db";

import type { ActionResult } from "./transactions";

const ABSORB_WINDOW_DAYS = 2;
const ABSORB_AMOUNT_TOLERANCE = 0.01;
const ABSORB_REMINDER_TOLERANCE_PCT = 0.05;

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
    const { start, end } = dayWindow(row.occurred_on, ABSORB_WINDOW_DAYS);

    const baseConditions = and(
      eq(transactions.user_id, userId),
      ne(transactions.source, syncSource),
      eq(transactions.kind, row.kind),
      eq(transactions.currency_original, row.currency),
      between(transactions.occurred_on, start, end),
    );

    let candidates = await db
      .select({
        id: transactions.id,
        note: transactions.note,
        comment: transactions.comment,
      })
      .from(transactions)
      .where(
        and(
          baseConditions,
          sql`abs(${transactions.amount_original} - ${row.amount}) <= ${ABSORB_AMOUNT_TOLERANCE}`,
        ),
      );

    if (candidates.length === 0) {
      // Reminder-created expenses carry the agreed amount, which can differ
      // from the synced charge by provider fees — allow a wider match.
      const tolerance = Math.abs(row.amount) * ABSORB_REMINDER_TOLERANCE_PCT;
      candidates = await db
        .select({
          id: transactions.id,
          note: transactions.note,
          comment: transactions.comment,
        })
        .from(transactions)
        .where(
          and(
            baseConditions,
            sql`${transactions.external_id} like 'reminder:%'`,
            sql`abs(${transactions.amount_original} - ${row.amount}) <= ${tolerance}`,
          ),
        );
    }

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
  apiKey?: string | null;
  apiSecret?: string | null;
  importIncome: boolean;
  extra?: Record<string, unknown>;
  initialSinceDays?: number;
}): Promise<ActionResult> {
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

  const apiKey = input.apiKey?.trim() || null;
  const apiSecret = input.apiSecret?.trim() || null;
  const aad = `${user.id}:${input.provider}`;

  // First connect requires both credentials. On edit, blank fields keep the
  // stored values — the secret is never sent to the client to be echoed back.
  if (!existing) {
    if (!apiKey) return { ok: false, error: "API key is required" };
    if (input.provider === "bybit" && !apiSecret) {
      return { ok: false, error: "API secret is required for Bybit" };
    }
  }

  try {
    if (!existing) {
      // Seed last_synced_at to (now - initialSinceDays) so the first sync picks
      // up that window.
      const seedLastSyncedAt = input.initialSinceDays
        ? new Date(
            Date.now() - input.initialSinceDays * 24 * 60 * 60 * 1000,
          ).toISOString()
        : undefined;
      await db.insert(api_integrations).values({
        user_id: user.id,
        provider: input.provider,
        api_key: encryptSecret(apiKey!, aad),
        api_secret: apiSecret ? encryptSecret(apiSecret, aad) : null,
        import_income: input.importIncome,
        extra: input.extra ?? {},
        ...(seedLastSyncedAt ? { last_synced_at: seedLastSyncedAt } : {}),
      });
    } else {
      const set: ApiIntegrationUpdate = { import_income: input.importIncome };
      if (apiKey) set.api_key = encryptSecret(apiKey, aad);
      if (apiSecret) set.api_secret = encryptSecret(apiSecret, aad);
      if (input.extra) set.extra = input.extra;
      await db
        .update(api_integrations)
        .set(set)
        .where(
          and(
            eq(api_integrations.user_id, user.id),
            eq(api_integrations.provider, input.provider),
          ),
        );
    }
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
  const aad = `${user.id}:${provider}`;
  let normalized;
  try {
    normalized = await adapter.fetchTransactions(
      {
        apiKey: decryptSecret(integration.api_key, aad),
        apiSecret: integration.api_secret
          ? decryptSecret(integration.api_secret, aad)
          : null,
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
        tags: tx.tags,
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

const AUTO_SYNC_MIN_INTERVAL_MS = 15 * 60 * 1000;

export async function autoSyncIntegrations(): Promise<
  ActionResult<{ imported: number }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const stale = await db
    .select({
      provider: api_integrations.provider,
      last_synced_at: api_integrations.last_synced_at,
    })
    .from(api_integrations)
    .where(eq(api_integrations.user_id, user.id))
    .then((rows) =>
      rows.filter(
        (row) =>
          !row.last_synced_at ||
          Date.now() - new Date(row.last_synced_at).getTime() >
            AUTO_SYNC_MIN_INTERVAL_MS,
      ),
    );

  let imported = 0;
  for (const row of stale) {
    const result = await syncIntegration(row.provider as IntegrationProvider);
    if (result.ok && result.data) imported += result.data.imported;
  }
  return { ok: true, data: { imported } };
}
