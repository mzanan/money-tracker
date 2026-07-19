import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";

export default async function DashboardPage() {
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
      places={data.places}
      reminders={remindersData.reminders}
      completedReminders={remindersData.completedReminders}
      today={remindersData.today}
      recentTags={data.recentTags}
    />
  );
}
