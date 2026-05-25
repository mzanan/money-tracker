import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { api_integrations } from "@/lib/db/schema";
import { getUser } from "@/lib/session";
import type { ApiIntegration, IntegrationProvider } from "@/types/db";

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
    .select()
    .from(api_integrations)
    .where(eq(api_integrations.user_id, user.id));

  const byProvider = new Map<IntegrationProvider, ApiIntegration>(
    integrations.map((i) => [i.provider, i]),
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
