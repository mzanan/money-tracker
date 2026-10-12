import { DashboardView } from "@/components/dashboard/dashboardView";
import { RatesByDateProvider } from "@/hooks/useRatesByDate";
import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";

export default async function DashboardPage() {
  const [data, remindersData] = await Promise.all([
    getHomePageData(),
    getRemindersData(),
  ]);

  return (
    <RatesByDateProvider value={data.ledger.ratesByDate}>
      <DashboardView
        yearMonth={data.yearMonth}
        movements={data.ledger.movements}
        places={data.places}
        reminders={remindersData.reminders}
        today={remindersData.today}
        withdrawalSources={data.withdrawalSources}
      />
    </RatesByDateProvider>
  );
}
