import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";

import { MonthDashboard } from "./monthDashboard";
import { LedgerProviders } from "./ledgerProviders";

export async function HomeDashboard() {
  const [data, remindersData] = await Promise.all([
    getHomePageData(),
    getRemindersData(),
  ]);

  return (
    <LedgerProviders ledger={data.ledger}>
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
    </LedgerProviders>
  );
}
