import { DashboardView } from "@/components/dashboard/dashboardView";
import { EntrySuggestionCatalogProvider } from "@/hooks/useEntrySuggestionCatalog";
import { RatesByDateProvider } from "@/hooks/useRatesByDate";
import { buildEntrySuggestions } from "@/lib/entrySuggestions";
import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";

export default async function DashboardPage() {
  const [data, remindersData] = await Promise.all([
    getHomePageData(),
    getRemindersData(),
  ]);

  return (
    <RatesByDateProvider value={data.ledger.ratesByDate}>
      <EntrySuggestionCatalogProvider
        value={buildEntrySuggestions(data.ledger.movements)}
      >
        <DashboardView
          yearMonth={data.yearMonth}
          movements={data.ledger.movements}
          places={data.places}
          reminders={remindersData.reminders}
          today={remindersData.today}
          withdrawalSources={data.withdrawalSources}
        />
      </EntrySuggestionCatalogProvider>
    </RatesByDateProvider>
  );
}
