import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { api_integrations, locations } from "@/lib/db/schema";
import { listAccountSources } from "@/lib/data/accounts";
import { getLedgerData } from "@/lib/data/ledgerMovements";
import { getUserSettings } from "@/lib/data/userSettings";
import { thisYearMonth, todayInTz } from "@/lib/dates";
import { cashWithdrawalSourcesByUsage } from "@/lib/filters";
import { resolveTimezone } from "@/lib/preferences.server";
import { requireUser } from "@/lib/session";
import { collectSources, csvSourcesFrom } from "@/lib/transactions";
import type { IntegrationProvider, Location } from "@/types/db";
import type { LedgerData } from "@/types/ledger";

export interface HomePageData {
  yearMonth: string;
  ledger: LedgerData;
  sources: string[];
  csvSources: string[];
  withdrawalSources: string[];
  recentTags: string[];
  places: Location[];
}

export async function getHomePageData(): Promise<HomePageData> {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const timezone = await resolveTimezone(settings?.timezone);

  const [ledger, integrationsRows, places, accountSources] = await Promise.all([
    getLedgerData(user.id, todayInTz(timezone)),
    db
      .select({ provider: api_integrations.provider })
      .from(api_integrations)
      .where(eq(api_integrations.user_id, user.id)),
    db.select().from(locations).where(eq(locations.user_id, user.id)),
    listAccountSources(user.id),
  ]);
  const movements = ledger.movements;

  const connectedProviderIds = integrationsRows.map(
    (i) => i.provider as IntegrationProvider,
  );

  const recentTags = uniqueStrings(
    movements.flatMap((movement) => movement.tags),
  ).slice(0, 12);

  const sources = collectSources(movements, [
    ...connectedProviderIds,
    ...accountSources,
  ]);

  return {
    yearMonth: thisYearMonth(timezone),
    ledger,
    sources,
    csvSources: csvSourcesFrom(movements),
    withdrawalSources: cashWithdrawalSourcesByUsage(sources, movements),
    recentTags,
    places,
  };
}

function uniqueStrings(
  input: ReadonlyArray<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(input.filter((v): v is string => Boolean(v && v.length > 0))),
  );
}
