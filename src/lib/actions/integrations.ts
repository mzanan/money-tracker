"use server";

import { and, between, eq, inArray, isNull, like, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { absorbDateRange, findAbsorbMatches } from "@/lib/absorb";
import { actionErrorMessage } from "@/lib/actionError";
import { isSupportedCurrency } from "@/lib/constants/currencies";
import { roundForCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { api_integrations, transactions, user_settings } from "@/lib/db/schema";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { ADAPTERS } from "@/lib/integrations";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import { getRates, RatesUnavailableError } from "@/lib/rates";
import {
  integrationProviderSchema,
  saveIntegrationSchema,
  type SaveIntegrationInput,
} from "@/lib/schemas/integration";
import { getUser } from "@/lib/session";
import { buildTransactionRow } from "@/lib/transactions";
import type { ApiIntegrationUpdate, IntegrationProvider } from "@/types/db";

import type { ActionResult } from "./transactions";

const ABSORBABLE_EXTERNAL_ID = or(
  isNull(transactions.external_id),
  like(transactions.external_id, `${EXTERNAL_ID_PREFIX.reminder}%`),
  like(transactions.external_id, `${EXTERNAL_ID_PREFIX.screenshot}%`),
);

const absorbColumns = {
  id: transactions.id,
  kind: transactions.kind,
  amount_original: transactions.amount_original,
  currency_original: transactions.currency_original,
  occurred_on: transactions.occurred_on,
  external_id: transactions.external_id,
  note: transactions.note,
  comment: transactions.comment,
  tags: transactions.tags,
  is_fixed: transactions.is_fixed,
  recurring_id: transactions.recurring_id,
  budget_month: transactions.budget_month,
};

async function absorbMatching(
  userId: string,
  syncSource: string,
  insertedIds: string[],
): Promise<number> {
  if (insertedIds.length === 0) return 0;

  const inserted = await db
    .select(absorbColumns)
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, userId),
        inArray(transactions.id, insertedIds),
      ),
    );
  if (inserted.length === 0) return 0;

  const { start, end } = absorbDateRange(inserted);
  const candidates = await db
    .select(absorbColumns)
    .from(transactions)
    .where(
      and(
        eq(transactions.user_id, userId),
        ne(transactions.source, syncSource),
        isNull(transactions.transfer_group),
        ABSORBABLE_EXTERNAL_ID,
        between(transactions.occurred_on, start, end),
      ),
    );

  const matches = findAbsorbMatches(inserted, candidates);
  if (matches.length === 0) return 0;

  await db.transaction(async (tx) => {
    for (const match of matches) {
      if (Object.keys(match.patch).length > 0) {
        await tx
          .update(transactions)
          .set(match.patch)
          .where(
            and(
              eq(transactions.user_id, userId),
              eq(transactions.id, match.syncedId),
            ),
          );
      }
      await tx
        .delete(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            eq(transactions.id, match.absorbedId),
            isNull(transactions.transfer_group),
          ),
        );
    }
  });

  return matches.length;
}

const DEFAULT_SINCE_DAYS = 30;

export async function saveIntegration(
  rawInput: SaveIntegrationInput,
): Promise<ActionResult> {
  const parsed = saveIntegrationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }
  const input = parsed.data;

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const existing = await db
    .select({
      provider: api_integrations.provider,
      api_key: api_integrations.api_key,
      api_secret: api_integrations.api_secret,
      extra: api_integrations.extra,
    })
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

  const credentialsChanged = apiKey !== null || apiSecret !== null;
  if (credentialsChanged) {
    try {
      const effectiveKey =
        apiKey ?? (existing ? decryptSecret(existing.api_key, aad) : null);
      const effectiveSecret =
        apiSecret ??
        (existing?.api_secret ? decryptSecret(existing.api_secret, aad) : null);
      if (!effectiveKey) return { ok: false, error: "API key is required" };
      await ADAPTERS[input.provider].verifyCredentials({
        apiKey: effectiveKey,
        apiSecret: effectiveSecret,
        extra: input.extra ?? existing?.extra ?? {},
      });
    } catch (error) {
      return {
        ok: false,
        error: `Could not verify credentials: ${error instanceof Error ? error.message : "unknown error"}`,
      };
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
      if (credentialsChanged) set.last_error = null;
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
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

export async function deleteIntegration(
  provider: IntegrationProvider,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!integrationProviderSchema.safeParse(provider).success) {
    return { ok: false, error: "Unknown provider" };
  }

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
      error: actionErrorMessage(error, "Delete failed"),
    };
  }
}

export async function setIntegrationAutoSync(
  provider: IntegrationProvider,
  enabled: boolean,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (
    !integrationProviderSchema.safeParse(provider).success ||
    typeof enabled !== "boolean"
  ) {
    return { ok: false, error: "Invalid data" };
  }

  try {
    await db
      .update(api_integrations)
      .set({ auto_sync: enabled })
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
      error: actionErrorMessage(error, "Save failed"),
    };
  }
}

export async function syncIntegration(
  provider: IntegrationProvider,
): Promise<ActionResult<{ imported: number; skipped: number; absorbed: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!integrationProviderSchema.safeParse(provider).success) {
    return { ok: false, error: "Unknown provider" };
  }

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
  const syncStartedAt = new Date().toISOString();
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
    const message = error instanceof Error ? error.message : "Sync failed";
    await db
      .update(api_integrations)
      .set({ last_error: message })
      .where(
        and(
          eq(api_integrations.user_id, user.id),
          eq(api_integrations.provider, provider),
        ),
      );
    revalidatePath("/settings");
    return { ok: false, error: message };
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
        error: actionErrorMessage(error, "Insert failed"),
      };
    }
  }

  await db
    .update(api_integrations)
    .set({
      last_error: null,
      ...(normalized.length > 0 ? { last_synced_at: syncStartedAt } : {}),
    })
    .where(
      and(
        eq(api_integrations.user_id, user.id),
        eq(api_integrations.provider, provider),
      ),
    );

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

  const [integrationRows, settingsRow] = await Promise.all([
    db
      .select({
        provider: api_integrations.provider,
        auto_sync: api_integrations.auto_sync,
        last_synced_at: api_integrations.last_synced_at,
        last_error: api_integrations.last_error,
      })
      .from(api_integrations)
      .where(eq(api_integrations.user_id, user.id)),
    db
      .select({ archived_sources: user_settings.archived_sources })
      .from(user_settings)
      .where(eq(user_settings.user_id, user.id))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  const archived = settingsRow?.archived_sources ?? [];
  const stale = integrationRows.filter(
    (row) =>
      row.auto_sync &&
      !row.last_error &&
      !archived.includes(row.provider) &&
      (!row.last_synced_at ||
        Date.now() - new Date(row.last_synced_at).getTime() >
          AUTO_SYNC_MIN_INTERVAL_MS),
  );

  let imported = 0;
  for (const row of stale) {
    const result = await syncIntegration(row.provider as IntegrationProvider);
    if (result.ok && result.data) imported += result.data.imported;
  }
  return { ok: true, data: { imported } };
}
