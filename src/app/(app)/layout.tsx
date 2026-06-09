import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { AssistantWidget } from "@/components/assistant/assistantWidget";
import { Header } from "@/components/layout/header";
import { InstallHint } from "@/components/pwa/installHint";
import { HideAmountsProvider } from "@/hooks/useHideAmounts";
import { SettingsProvider } from "@/hooks/useSettings";
import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { readHideAmountsCookie } from "@/lib/preferences.server";
import { getUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-out");
  }

  const [settings, hideAmounts] = await Promise.all([
    db
      .select()
      .from(user_settings)
      .where(eq(user_settings.user_id, user.id))
      .limit(1)
      .then((rows) => rows[0]),
    readHideAmountsCookie(),
  ]);

  if (!settings || !settings.onboarded_at) {
    redirect("/onboarding");
  }

  return (
    <SettingsProvider value={settings}>
      <HideAmountsProvider initial={hideAmounts}>
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col lg:max-w-6xl">
          <Header />
          <main className="flex-1 px-4 pt-2 pb-8">{children}</main>
        </div>
        <AssistantWidget />
        <InstallHint />
      </HideAmountsProvider>
    </SettingsProvider>
  );
}
