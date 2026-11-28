import { forUser } from "@/lib/db/scope";
import { api_integrations } from "@/lib/db/schema";
import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

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
