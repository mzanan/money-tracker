import { EntrySuggestionCatalogProvider } from "@/hooks/useEntrySuggestionCatalog";
import { RatesByDateProvider } from "@/hooks/useRatesByDate";
import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";
import { buildEntrySuggestions } from "@/lib/entrySuggestions";

import { MonthDashboard } from "./monthDashboard";

export async function HomeDashboard() {
  const [data, remindersData] = await Promise.all([
    getHomePageData(),
    getRemindersData(),
  ]);

  return (
    <RatesByDateProvider value={data.ledger.ratesByDate}>
      <EntrySuggestionCatalogProvider
        value={buildEntrySuggestions(data.ledger.movements)}
      >
        <MonthDashboard
          yearMonth={data.yearMonth}
          movements={data.ledger.movements}
          sources={data.sources}
          csvSources={data.csvSources}
          withdrawalSources={data.withdrawalSources}
          places={data.places}
          reminders={remindersData.reminders}
          completedReminders={remindersData.completedReminders}
          today={remindersData.today}
          recentTags={data.recentTags}
        />
      </EntrySuggestionCatalogProvider>
    </RatesByDateProvider>
  );
}
