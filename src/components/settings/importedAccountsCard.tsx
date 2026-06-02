import { getImportedSources } from "@/lib/data/sources";
import { getUser } from "@/lib/session";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ImportedAccountRow } from "./importedAccountRow";

export async function ImportedAccountsCard() {
  const user = await getUser();
  if (!user) return null;

  const sources = await getImportedSources(user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imported accounts</CardTitle>
        <CardDescription>
          Rename an account or delete every transaction it holds.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid divide-y">
        {sources.length === 0 ? (
          <p className="text-muted-foreground py-2 text-xs">
            No transactions yet.
          </p>
        ) : (
          sources.map((s) => (
            <ImportedAccountRow
              key={s.source}
              source={s.source}
              count={s.count}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
