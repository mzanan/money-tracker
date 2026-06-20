import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { QuickAddForm } from "@/components/transactions/quickAddForm";
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
      places={data.places}
      reminders={remindersData.reminders}
      today={remindersData.today}
      quickAdd={
        <QuickAddForm key="quick-add" recentTags={data.recentTags} />
      }
    />
  );
}
