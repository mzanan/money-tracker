import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { api_integrations } from "@/lib/db/schema";
import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

export async function getIntegrationSummaries(
  userId: string,
): Promise<Map<IntegrationProvider, IntegrationSummary>> {
  const integrations = await db
    .select({
      provider: api_integrations.provider,
      import_income: api_integrations.import_income,
      last_synced_at: api_integrations.last_synced_at,
    })
    .from(api_integrations)
    .where(eq(api_integrations.user_id, userId));

  return new Map<IntegrationProvider, IntegrationSummary>(
    integrations.map((i) => [
      i.provider,
      { importIncome: i.import_income, lastSyncedAt: i.last_synced_at },
    ]),
  );
}
