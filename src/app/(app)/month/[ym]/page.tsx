import { notFound } from "next/navigation";
import { EntrySuggestionCatalogProvider } from "@/hooks/useEntrySuggestionCatalog";
import { RatesByDateProvider } from "@/hooks/useRatesByDate";

import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { cashWithdrawalSourcesByUsage } from "@/lib/filters";
import { listAccountSources } from "@/lib/data/accounts";
import { getMonthPageData } from "@/lib/data/monthData";
import { buildEntrySuggestions } from "@/lib/entrySuggestions";
import { collectSources, csvSourcesFrom } from "@/lib/transactions";
import { getRemindersData } from "@/lib/data/reminders";
import { isValidYearMonth } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  if (!isValidYearMonth(ym)) {
    notFound();
  }

  const user = await requireUser();
  const [data, remindersData, accountSources] = await Promise.all([
    getMonthPageData(ym),
    getRemindersData(),
    listAccountSources(user.id),
  ]);
  const sources = collectSources(data.ledger.movements, accountSources);
  const csvSources = csvSourcesFrom(data.ledger.movements);

  return (
    <RatesByDateProvider value={data.ledger.ratesByDate}>
      <EntrySuggestionCatalogProvider
        value={buildEntrySuggestions(data.ledger.movements)}
      >
        <MonthDashboard
          yearMonth={data.yearMonth}
          movements={data.ledger.movements}
          sources={sources}
          csvSources={csvSources}
          withdrawalSources={cashWithdrawalSourcesByUsage(
            sources,
            data.ledger.movements,
          )}
          places={data.places}
          reminders={remindersData.reminders}
          completedReminders={remindersData.completedReminders}
          today={remindersData.today}
        />
      </EntrySuggestionCatalogProvider>
    </RatesByDateProvider>
  );
}
