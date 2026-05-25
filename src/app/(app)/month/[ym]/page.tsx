import { notFound } from "next/navigation";

import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { MonthNav } from "@/components/transactions/monthNav";
import { getMonthPageData } from "@/lib/data/monthData";
import { isValidYearMonth } from "@/lib/dates";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  if (!isValidYearMonth(ym)) {
    notFound();
  }

  const data = await getMonthPageData(ym);
  const sources = collectSources(data.lifetimeTxs);

  return (
    <MonthDashboard
      yearMonth={data.yearMonth}
      monthTransactions={data.monthTxs}
      lifetimeTransactions={data.lifetimeTxs}
      sources={sources}
      nav={
        <MonthNav
          key="month-nav"
          yearMonth={data.yearMonth}
          hasOlder={data.hasOlder}
          hasNewer={data.hasNewer}
        />
      }
    />
  );
}

function collectSources(
  txs: ReadonlyArray<{ source: string }>,
): string[] {
  const set = new Set<string>();
  for (const tx of txs) {
    if (tx.source) set.add(tx.source);
  }
  return Array.from(set).sort();
}
