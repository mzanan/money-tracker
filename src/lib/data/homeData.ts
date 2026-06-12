import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { api_integrations, locations, transactions } from "@/lib/db/schema";
import { getUserSettings } from "@/lib/data/userSettings";
import { thisYearMonth } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import type { IntegrationProvider, Location, Transaction } from "@/types/db";

export interface HomePageData {
  yearMonth: string;
  lifetimeTxs: Transaction[];
  sources: string[];
  recentTags: string[];
  recentMerchants: string[];
  places: Location[];
}

export async function getHomePageData(): Promise<HomePageData> {
  const user = await requireUser();

  const [settings, lifetimeTxs, integrationsRows, places] = await Promise.all([
    getUserSettings(user.id),
    db.select().from(transactions).where(eq(transactions.user_id, user.id)),
    db
      .select({ provider: api_integrations.provider })
      .from(api_integrations)
      .where(eq(api_integrations.user_id, user.id)),
    db.select().from(locations).where(eq(locations.user_id, user.id)),
  ]);

  const yearMonth = thisYearMonth(settings?.timezone ?? "UTC");

  const connectedProviderIds = integrationsRows.map(
    (i) => i.provider as IntegrationProvider,
  );

  const byRecency = lifetimeTxs
    .slice()
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  const recentTags = uniqueStrings(byRecency.flatMap((tx) => tx.tags)).slice(
    0,
    12,
  );

  const recentMerchants = uniqueStrings(
    byRecency.map((tx) => tx.note?.trim() ?? null),
  ).slice(0, 30);

  const sources = collectSources(lifetimeTxs, connectedProviderIds);

  return {
    yearMonth,
    lifetimeTxs,
    sources,
    recentTags,
    recentMerchants,
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

function collectSources(
  txs: ReadonlyArray<Pick<Transaction, "source">>,
  connectedProviderIds: ReadonlyArray<IntegrationProvider>,
): string[] {
  const set = new Set<string>();
  for (const tx of txs) {
    if (tx.source) set.add(tx.source);
  }
  for (const id of connectedProviderIds) set.add(id);
  return Array.from(set).sort();
}
