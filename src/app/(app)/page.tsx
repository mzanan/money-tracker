import { UpcomingBanner } from "@/components/reminders/upcomingBanner";
import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { MonthNav } from "@/components/transactions/monthNav";
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
      monthTransactions={data.monthTxs}
      lifetimeTransactions={data.lifetimeTxs}
      sources={data.sources}
      reminders={remindersData.reminders}
      today={remindersData.today}
      nav={
        <MonthNav
          key="month-nav"
          yearMonth={data.yearMonth}
          hasOlder={data.hasOlder}
          hasNewer={false}
        />
      }
      banner={
        <UpcomingBanner
          reminders={remindersData.reminders}
          today={remindersData.today}
        />
      }
      quickAdd={
        <QuickAddForm
          key="quick-add"
          recentCategories={data.recentCategories}
          recentMerchants={data.recentMerchants}
        />
      }
    />
  );
}
