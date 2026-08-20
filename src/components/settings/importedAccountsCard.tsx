import { listAccounts, resolveSourceLabel } from "@/lib/data/accounts";
import { getImportedSources } from "@/lib/data/sources";
import { getUser } from "@/lib/session";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AddAccountRow } from "./addAccountRow";
import { ImportedAccountRow } from "./importedAccountRow";

export async function ImportedAccountsCard() {
  const user = await getUser();
  if (!user) return null;

  const [sourceRows, accountRows] = await Promise.all([
    getImportedSources(user.id),
    listAccounts(user.id),
  ]);

  const accountLabels = Object.fromEntries(
    accountRows.map((a) => [a.source, a.label]),
  );
  const counts = new Map(sourceRows.map((s) => [s.source, s.count]));
  const sources = new Set([
    ...sourceRows.map((s) => s.source),
    ...accountRows.map((a) => a.source),
  ]);

  const rows = Array.from(sources)
    .map((source) => ({
      source,
      count: counts.get(source) ?? 0,
      label: resolveSourceLabel(source, accountLabels),
      hasAccount: source in accountLabels,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>
          Create, rename or remove accounts, or delete every transaction one
          holds.
        </CardDescription>
      </CardHeader>
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
          />
        ))}
        <AddAccountRow />
      </CardContent>
    </Card>
  );
}
