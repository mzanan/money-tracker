import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { QuickAddForm } from "@/components/transactions/quickAddForm";
import { getHomePageData } from "@/lib/data/homeData";

export default async function DashboardPage() {
  const data = await getHomePageData();

  return (
    <MonthDashboard
      yearMonth={data.yearMonth}
      monthTransactions={data.monthTxs}
      lifetimeTransactions={data.lifetimeTxs}
      sources={data.sources}
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
