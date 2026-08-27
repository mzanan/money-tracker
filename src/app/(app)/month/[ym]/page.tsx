import { notFound } from "next/navigation";

import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { listAccountSources } from "@/lib/data/accounts";
import { getMonthPageData } from "@/lib/data/monthData";
import { collectSources, csvSourcesFrom } from "@/lib/transactions";
import { getRemindersData } from "@/lib/data/reminders";
import { isValidYearMonth } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  if (!isValidYearMonth(ym)) {
    notFound();
  }

  const user = await requireUser();
  const [data, remindersData, accountSources] = await Promise.all([
    getMonthPageData(ym),
    getRemindersData(),
    listAccountSources(user.id),
  ]);
  const sources = collectSources(data.lifetimeTxs, accountSources);
  const csvSources = csvSourcesFrom(data.lifetimeTxs);

  return (
    <MonthDashboard
      yearMonth={data.yearMonth}
      lifetimeTransactions={data.lifetimeTxs}
      sources={sources}
      csvSources={csvSources}
      places={data.places}
      reminders={remindersData.reminders}
      completedReminders={remindersData.completedReminders}
      today={remindersData.today}
    />
  );
}
