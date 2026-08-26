import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { getMonthPageData } from "@/lib/data/monthData";
import { csvSourcesFrom } from "@/lib/transactions";
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
  const [data, remindersData, accountRows] = await Promise.all([
    getMonthPageData(ym),
    getRemindersData(),
    db
      .select({ source: accounts.source })
      .from(accounts)
      .where(eq(accounts.user_id, user.id)),
  ]);
  const sources = collectSources(
    data.lifetimeTxs,
    accountRows.map((row) => row.source),
  );
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

function collectSources(
  txs: ReadonlyArray<{ source: string }>,
  accountSources: ReadonlyArray<string>,
): string[] {
  const set = new Set<string>();
  for (const tx of txs) {
    if (tx.source) set.add(tx.source);
  }
  for (const source of accountSources) set.add(source);
  return Array.from(set).sort();
}
