import {
  getAccountCurrencies,
  listAccounts,
  resolveSourceLabel,
} from "@/lib/data/accounts";
import { getIntegrationSummaries } from "@/lib/data/integrations";
import {
  getImportedSources,
  getSuggestedAccountCurrencies,
} from "@/lib/data/sources";
import { getUserSettings } from "@/lib/data/userSettings";
import { getUser } from "@/lib/session";
import type { IntegrationProvider } from "@/types/db";

import { Card, CardContent } from "@/components/ui/card";

import { AddAccountRow } from "./addAccountRow";
import { ImportedAccountRow } from "./importedAccountRow";

export async function ImportedAccountsCard() {
  const user = await getUser();
  if (!user) return null;

  const [
    sourceRows,
    accountRows,
    integrations,
    settings,
    declaredCurrencies,
    suggestedCurrencies,
  ] = await Promise.all([
    getImportedSources(user.id),
    listAccounts(user.id),
    getIntegrationSummaries(user.id),
    getUserSettings(user.id),
    getAccountCurrencies(user.id),
    getSuggestedAccountCurrencies(user.id),
  ]);

  const accountLabels = Object.fromEntries(
    accountRows.map((a) => [a.source, a.label]),
  );
  const counts = new Map(sourceRows.map((s) => [s.source, s.count]));
  const sources = new Set([
    ...sourceRows.map((s) => s.source),
    ...accountRows.map((a) => a.source),
    ...(settings?.archived_sources ?? []),
  ]);

  const rows = Array.from(sources)
    .map((source) => ({
      source,
      count: counts.get(source) ?? 0,
      label: resolveSourceLabel(source, accountLabels),
      hasAccount: source in accountLabels,
      currencies: declaredCurrencies[source] ?? [],
      suggestedCurrency: suggestedCurrencies[source] ?? null,
      integration: integrations.get(source as IntegrationProvider) ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Card>
      <CardContent className="grid divide-y">
        {rows.length === 0 && (
          <p className="text-muted-foreground py-2 text-xs">
            No transactions yet.
          </p>
        )}
        {rows.map((row) => (
          <ImportedAccountRow
            key={row.source}
            source={row.source}
            label={row.label}
            count={row.count}
            hasAccount={row.hasAccount}
            currencies={row.currencies}
            suggestedCurrency={row.suggestedCurrency}
            integration={row.integration}
          />
        ))}
        <AddAccountRow />
      </CardContent>
    </Card>
  );
}
