import { DashboardView } from "@/components/dashboard/DashboardView";
import { getHomePageData } from "@/lib/data/homeData";

export default async function DashboardPage() {
  const data = await getHomePageData();

  return (
    <DashboardView
      yearMonth={data.yearMonth}
      lifetimeTransactions={data.lifetimeTxs}
      places={data.places}
    />
  );
}
