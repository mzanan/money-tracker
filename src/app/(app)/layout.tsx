import { redirect } from "next/navigation";

import { BottomNav } from "@/components/layout/bottomNav";
import { Header } from "@/components/layout/header";
import { AutoSync } from "@/components/providers/autoSync";
import { ConfirmProvider } from "@/components/providers/confirmProvider";
import { InstallHint } from "@/components/pwa/installHint";
import { MergeBar } from "@/components/transactions/mergeBar";
import { HideAmountsProvider } from "@/hooks/useHideAmounts";
import { SettingsProvider } from "@/hooks/useSettings";
import { getUserSettings } from "@/lib/data/userSettings";
import { readHideAmountsCookie } from "@/lib/preferences.server";
import { getUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const [settings, hideAmounts] = await Promise.all([
    getUserSettings(user.id),
    readHideAmountsCookie(),
  ]);

  if (!settings || !settings.onboarded_at) {
    redirect("/onboarding");
  }

  return (
    <SettingsProvider value={settings}>
      <HideAmountsProvider initial={hideAmounts}>
        <ConfirmProvider>
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col lg:max-w-(--container-content-max)">
          <Header />
          <main className="flex-1 px-4 pt-2 pb-24 lg:pb-8">{children}</main>
        </div>
        <BottomNav />
        <InstallHint />
        <MergeBar />
        </ConfirmProvider>
        <AutoSync />
      </HideAmountsProvider>
    </SettingsProvider>
  );
}
