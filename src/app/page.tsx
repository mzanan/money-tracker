import type { Metadata } from "next";

import { Landing } from "@/components/landing/landing";
import { AppShell } from "@/components/layout/appShell";
import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";
import { getUser } from "@/lib/session";

const LANDING_TITLE =
  "Money Tracker: your money across currencies, in one place";
const LANDING_DESCRIPTION =
  "For digital nomads, expats, and anyone who lives in more than one currency.";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getUser();
  if (user) return {};
  return {
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    openGraph: { title: LANDING_TITLE, description: LANDING_DESCRIPTION },
  };
}

export default async function HomePage() {
  const user = await getUser();
  if (!user) return <Landing />;

  const [data, remindersData] = await Promise.all([
    getHomePageData(),
    getRemindersData(),
  ]);

  return (
    <AppShell user={user}>
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
    </AppShell>
  );
}
