import { notFound } from "next/navigation";

import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { getMonthPageData } from "@/lib/data/monthData";
import { csvSourcesFrom } from "@/lib/transactions";
import { getRemindersData } from "@/lib/data/reminders";
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

  const [data, remindersData] = await Promise.all([
    getMonthPageData(ym),
    getRemindersData(),
  ]);
  const sources = collectSources(data.lifetimeTxs);
  const csvSources = csvSourcesFrom(data.lifetimeTxs);

  return (
    <MonthDashboard
      yearMonth={data.yearMonth}
      lifetimeTransactions={data.lifetimeTxs}
      sources={sources}
      csvSources={csvSources}
      places={data.places}
      reminders={remindersData.reminders}
      today={remindersData.today}
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
