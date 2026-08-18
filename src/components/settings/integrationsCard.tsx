import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { api_integrations } from "@/lib/db/schema";
import { getUser } from "@/lib/session";
import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { IntegrationRow } from "./integrationRow";

const PROVIDERS: { id: IntegrationProvider; label: string }[] = [
  { id: "bybit", label: "Bybit" },
];

export async function IntegrationsCard() {
  const user = await getUser();
  if (!user) return null;

  const integrations = await db
    .select({
      provider: api_integrations.provider,
      import_income: api_integrations.import_income,
      last_synced_at: api_integrations.last_synced_at,
    })
    .from(api_integrations)
    .where(eq(api_integrations.user_id, user.id));

  const byProvider = new Map<IntegrationProvider, IntegrationSummary>(
    integrations.map((i) => [
      i.provider,
      { importIncome: i.import_income, lastSyncedAt: i.last_synced_at },
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Pull transactions automatically from your accounts. Manual sync only.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid divide-y">
        {PROVIDERS.map(({ id, label }) => (
          <IntegrationRow
            key={id}
            provider={id}
            label={label}
            integration={byProvider.get(id) ?? null}
          />
        ))}
      </CardContent>
    </Card>
  );
}
