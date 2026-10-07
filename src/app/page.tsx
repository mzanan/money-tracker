import type { Metadata } from "next";

import { Landing } from "@/components/landing/landing";
import { AppShell } from "@/components/layout/appShell";
import { MonthDashboard } from "@/components/transactions/monthDashboard";
import { JsonLd } from "@/components/ui/jsonLd";
import { getHomePageData } from "@/lib/data/homeData";
import { getRemindersData } from "@/lib/data/reminders";
import {
  LANDING_DESCRIPTION,
  LANDING_TITLE,
  OG_IMAGE,
  SITE_NAME,
  landingJsonLd,
} from "@/lib/seo";
import { getUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getUser();
  if (user) return {};
  return {
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: "/",
      title: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
      images: [OG_IMAGE],
    },
  };
}

export default async function HomePage() {
  const user = await getUser();
  if (!user)
    return (
      <>
        <JsonLd data={landingJsonLd} />
        <Landing />
      </>
    );

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
        withdrawalSources={data.withdrawalSources}
        places={data.places}
        reminders={remindersData.reminders}
        completedReminders={remindersData.completedReminders}
        today={remindersData.today}
        recentTags={data.recentTags}
      />
    </AppShell>
  );
}
