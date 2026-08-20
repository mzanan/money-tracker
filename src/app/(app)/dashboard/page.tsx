import { DashboardView } from "@/components/dashboard/dashboardView";
import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";

export default async function DashboardPage() {
  const [data, remindersData] = await Promise.all([
    getHomePageData(),
    getRemindersData(),
  ]);

  return (
    <DashboardView
      yearMonth={data.yearMonth}
      lifetimeTransactions={data.lifetimeTxs}
      places={data.places}
      reminders={remindersData.reminders}
      today={remindersData.today}
    />
  );
}
