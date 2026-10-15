import { DashboardView } from "@/components/dashboard/dashboardView";
import { LedgerProviders } from "@/components/transactions/ledgerProviders";
import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";

export default async function DashboardPage() {
  const [data, remindersData] = await Promise.all([
    getHomePageData(),
    getRemindersData(),
  ]);

  return (
    <LedgerProviders ledger={data.ledger}>
      <DashboardView
        yearMonth={data.yearMonth}
        movements={data.ledger.movements}
        places={data.places}
        reminders={remindersData.reminders}
        today={remindersData.today}
        withdrawalSources={data.withdrawalSources}
      />
    </LedgerProviders>
  );
}
