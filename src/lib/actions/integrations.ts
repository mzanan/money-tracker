"use server";

import { revalidatePath } from "next/cache";

import { absorbDateRange, absorbPlan } from "@/lib/absorb";
import { actionErrorMessage } from "@/lib/actionError";
import { dateInTz } from "@/lib/dates";
import { forUser } from "@/lib/db/scope";
import {
  getAutoSyncRows,
  getIntegration,
  getIntegrationCredentials,
  insertIntegration,
  removeIntegration,
  updateIntegration,
} from "@/lib/data/integrations";
import { getArchivedSources, getUserTimezone } from "@/lib/data/userSettings";
import {
  deleteLedgerTransactions,
  existingExternalIds,
  getLedgerRecordsBetween,
  postLedgerTransactions,
} from "@/lib/data/ledgerWrites";
import { getScaleOf } from "@/lib/data/cryptoAssets";
import { ADAPTERS } from "@/lib/integrations";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import {
  freshSynced,
  syncedDraft,
  type SyncedDraft,
} from "@/lib/integrations/syncedDraft";
import { hasStorageScale } from "@/lib/ledger/scale";
import { resolveTimezone } from "@/lib/preferences.server";
import {
  integrationProviderSchema,
  saveIntegrationSchema,
  type SaveIntegrationInput,
} from "@/lib/schemas/integration";
import { getUser } from "@/lib/session";
import type { ApiIntegrationUpdate, IntegrationProvider } from "@/types/db";

import type { ActionResult } from "./transactions";

async function postSynced(
  userId: string,
  syncSource: string,
  drafts: ReadonlyArray<SyncedDraft>,
): Promise<{ imported: number; absorbed: number }> {
  return forUser(userId).transaction(async (txScope) => {
    const taken = await existingExternalIds(
      txScope,
      syncSource,
      drafts.map(({ externalId }) => externalId),
    );
    const fresh = freshSynced(drafts, taken);
    if (fresh.length === 0) return { imported: 0, absorbed: 0 };
    const absorbable = fresh.filter((draft) => draft.absorbable);
    const direct = fresh.filter((draft) => !draft.absorbable);
    await postLedgerTransactions(
      txScope,
      direct.map(({ id, draft }) => ({ id, draft })),
    );
    if (absorbable.length === 0) {
      return { imported: fresh.length, absorbed: 0 };
    }
    const { start, end } = absorbDateRange(absorbable.map(({ row }) => row));
    const records = await getLedgerRecordsBetween(txScope, start, end);
    const plan = absorbPlan(absorbable, records, syncSource);
    await postLedgerTransactions(txScope, plan.writes);
    await deleteLedgerTransactions(txScope, plan.absorbedIds);
    if (plan.feeDrafts.length > 0) {
      await postLedgerTransactions(
        txScope,
        plan.feeDrafts.map((draft) => ({ draft })),
      );
    }
    return { imported: fresh.length, absorbed: plan.absorbedIds.length };
  });
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

  const existing = await getIntegrationCredentials(user.id, input.provider);

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
      await insertIntegration(user.id, {
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
      await updateIntegration(user.id, input.provider, set);
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
    await removeIntegration(user.id, provider);
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
    await updateIntegration(user.id, provider, { auto_sync: enabled });
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
): Promise<
  ActionResult<{ imported: number; skipped: number; absorbed: number }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!integrationProviderSchema.safeParse(provider).success) {
    return { ok: false, error: "Unknown provider" };
  }

  const integration = await getIntegration(user.id, provider);
  if (!integration) return { ok: false, error: "Integration not connected" };

  const settings = await getUserTimezone(user.id);
  if (!settings) return { ok: false, error: "Settings not found" };
  const timezone = await resolveTimezone(settings.timezone);

  const scaleOf = await getScaleOf();

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
    await updateIntegration(user.id, provider, { last_error: message });
    revalidatePath("/settings");
    return { ok: false, error: message };
  }

  let skippedNoRate = 0;
  let skippedIncome = 0;
  const drafts: SyncedDraft[] = [];
  for (const tx of normalized) {
    if (!integration.import_income && tx.kind === "income") {
      skippedIncome += 1;
      continue;
    }
    const currencies = tx.exchange
      ? [tx.exchange.sent.currency, tx.exchange.received.currency]
      : [tx.currency];
    if (!currencies.every((currency) => hasStorageScale(currency, scaleOf))) {
      skippedNoRate += 1;
      continue;
    }
    const draft = syncedDraft(
      tx,
      provider,
      dateInTz(tx.occurredAt, timezone),
      scaleOf,
    );
    if (draft) drafts.push(draft);
  }

  let imported = 0;
  let absorbed = 0;
  if (drafts.length > 0) {
    try {
      ({ imported, absorbed } = await postSynced(user.id, provider, drafts));
    } catch (error) {
      return {
        ok: false,
        error: actionErrorMessage(error, "Insert failed"),
      };
    }
  }

  await updateIntegration(user.id, provider, {
    last_error: null,
    ...(normalized.length > 0 ? { last_synced_at: syncStartedAt } : {}),
  });

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
    getAutoSyncRows(user.id),
    getArchivedSources(user.id),
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
