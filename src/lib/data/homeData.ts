import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  api_integrations,
  transactions,
  user_settings,
} from "@/lib/db/schema";
import {
  monthBounds,
  oldestYearMonthFrom,
  shiftYearMonth,
  thisYearMonth,
} from "@/lib/dates";
import { requireUser } from "@/lib/session";
import type {
  IntegrationProvider,
  Transaction,
  UserSettings,
} from "@/types/db";

export interface HomePageData {
  settings: Pick<UserSettings, "timezone"> | null;
  yearMonth: string;
  monthTxs: Transaction[];
  lifetimeTxs: Transaction[];
  connectedProviderIds: IntegrationProvider[];
  sources: string[];
  recentCategories: string[];
  recentMerchants: string[];
  oldestYearMonth: string | null;
  hasOlder: boolean;
}

export async function getHomePageData(): Promise<HomePageData> {
  const user = await requireUser();

  const settings = await db
    .select({ timezone: user_settings.timezone })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  const yearMonth = thisYearMonth(settings?.timezone ?? "UTC");
  const [start, end] = monthBounds(yearMonth);

  const [
    monthTxs,
    lifetimeTxs,
    integrationsRows,
    categoriesRows,
    merchantsRows,
  ] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, user.id),
          gte(transactions.occurred_on, start),
          lte(transactions.occurred_on, end),
        ),
      )
      .orderBy(desc(transactions.occurred_on), desc(transactions.occurred_at)),
    db.select().from(transactions).where(eq(transactions.user_id, user.id)),
    db
      .select({ provider: api_integrations.provider })
      .from(api_integrations)
      .where(eq(api_integrations.user_id, user.id)),
    db
      .select({ category: transactions.category })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, user.id),
          isNotNull(transactions.category),
        ),
      )
      .orderBy(desc(transactions.occurred_at))
      .limit(120),
    db
      .select({ note: transactions.note })
      .from(transactions)
      .where(
        and(eq(transactions.user_id, user.id), isNotNull(transactions.note)),
      )
      .orderBy(desc(transactions.occurred_at))
      .limit(200),
  ]);

  const connectedProviderIds = integrationsRows.map(
    (i) => i.provider as IntegrationProvider,
  );

  const recentCategories = uniqueStrings(
    categoriesRows.map((row) => row.category),
  ).slice(0, 12);

  const recentMerchants = uniqueStrings(
    merchantsRows.map((row) => row.note?.trim() ?? null),
  ).slice(0, 30);

  const sources = collectSources(lifetimeTxs, connectedProviderIds);

  const oldestYearMonth = oldestYearMonthFrom(lifetimeTxs);
  const prev = shiftYearMonth(yearMonth, -1);
  const hasOlder = oldestYearMonth !== null && prev >= oldestYearMonth;

  return {
    settings: settings ?? null,
    yearMonth,
    monthTxs,
    lifetimeTxs,
    connectedProviderIds,
    sources,
    recentCategories,
    recentMerchants,
    oldestYearMonth,
    hasOlder,
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
