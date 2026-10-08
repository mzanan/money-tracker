import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { getHomePageData } from "@/lib/data/homeData";
import { buildEntrySuggestions } from "@/lib/entrySuggestions";
import { getRemindersData } from "@/lib/data/reminders";

export default async function HomeDashboardPage() {
  const [data, remindersData] = await Promise.all([
    getHomePageData(),
    getRemindersData(),
  ]);

  return (
    <MonthDashboard
      yearMonth={data.yearMonth}
      lifetimeTransactions={data.lifetimeTxs}
      sources={data.sources}
      csvSources={data.csvSources}
      withdrawalSources={data.withdrawalSources}
      places={data.places}
      costBasisSources={data.costBasisSources}
      reminders={remindersData.reminders}
      completedReminders={remindersData.completedReminders}
      today={remindersData.today}
      recentTags={data.recentTags}
      entrySuggestions={buildEntrySuggestions(data.lifetimeTxs)}
    />
  );
}
