import type { Metadata } from "next";

import { Landing } from "@/components/landing/landing";
import { AppShell } from "@/components/layout/appShell";
import { HomeDashboard } from "@/components/transactions/homeDashboard";
import { JsonLd } from "@/components/ui/jsonLd";
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

  return (
    <AppShell user={user}>
      <HomeDashboard />
    </AppShell>
  );
}
