import { getIntegrationSummaries } from "@/lib/data/integrations";
import { getUser } from "@/lib/session";
import type { IntegrationProvider } from "@/types/db";

import { Card, CardContent } from "@/components/ui/card";

import { IntegrationRow } from "./integrationRow";

const PROVIDERS: { id: IntegrationProvider; label: string }[] = [
  { id: "bybit", label: "Bybit" },
];

export async function IntegrationsCard() {
  const user = await getUser();
  if (!user) return null;

  const byProvider = await getIntegrationSummaries(user.id);

  return (
    <Card>
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
