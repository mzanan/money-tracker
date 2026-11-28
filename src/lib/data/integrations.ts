import { eq } from "drizzle-orm";

import { forUser } from "@/lib/db/scope";
import { api_integrations } from "@/lib/db/schema";
import type {
  ApiIntegration,
  ApiIntegrationInsert,
  ApiIntegrationUpdate,
  IntegrationProvider,
  IntegrationSummary,
} from "@/types/db";

export async function getIntegrationSummaries(
  userId: string,
): Promise<Map<IntegrationProvider, IntegrationSummary>> {
  const integrations = await forUser(userId)
    .select({
      provider: api_integrations.provider,
      import_income: api_integrations.import_income,
      auto_sync: api_integrations.auto_sync,
      last_synced_at: api_integrations.last_synced_at,
      last_error: api_integrations.last_error,
    })
    .from(api_integrations);

  return new Map<IntegrationProvider, IntegrationSummary>(
    integrations.map((i) => [
      i.provider,
      {
        importIncome: i.import_income,
        autoSync: i.auto_sync,
        lastSyncedAt: i.last_synced_at,
        lastError: i.last_error,
      },
    ]),
  );
}

export async function getConnectedProviders(
  userId: string,
): Promise<Array<{ provider: IntegrationProvider }>> {
  return forUser(userId)
    .select({ provider: api_integrations.provider })
    .from(api_integrations);
}

export async function getIntegrationCredentials(
  userId: string,
  provider: IntegrationProvider,
): Promise<
  | Pick<ApiIntegration, "provider" | "api_key" | "api_secret" | "extra">
  | undefined
> {
  return forUser(userId)
    .select({
      provider: api_integrations.provider,
      api_key: api_integrations.api_key,
      api_secret: api_integrations.api_secret,
      extra: api_integrations.extra,
    })
    .from(api_integrations, eq(api_integrations.provider, provider))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function getIntegration(
  userId: string,
  provider: IntegrationProvider,
): Promise<ApiIntegration | undefined> {
  return forUser(userId)
    .selectFrom(api_integrations, eq(api_integrations.provider, provider))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function getAutoSyncRows(
  userId: string,
): Promise<
  Array<
    Pick<
      ApiIntegration,
      "provider" | "auto_sync" | "last_synced_at" | "last_error"
    >
  >
> {
  return forUser(userId)
    .select({
      provider: api_integrations.provider,
      auto_sync: api_integrations.auto_sync,
      last_synced_at: api_integrations.last_synced_at,
      last_error: api_integrations.last_error,
    })
    .from(api_integrations);
}

export async function insertIntegration(
  userId: string,
  values: Omit<ApiIntegrationInsert, "user_id">,
): Promise<void> {
  await forUser(userId).insert(api_integrations, values);
}

export async function updateIntegration(
  userId: string,
  provider: IntegrationProvider,
  set: ApiIntegrationUpdate,
): Promise<void> {
  await forUser(userId).update(
    api_integrations,
    set,
    eq(api_integrations.provider, provider),
  );
}

export async function removeIntegration(
  userId: string,
  provider: IntegrationProvider,
): Promise<void> {
  await forUser(userId).delete(
    api_integrations,
    eq(api_integrations.provider, provider),
  );
}
