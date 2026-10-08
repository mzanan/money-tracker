import { redirect } from "next/navigation";

import { BottomNav } from "@/components/layout/bottomNav";
import { Header } from "@/components/layout/header";
import { AnalyticsIdentify } from "@/components/providers/analyticsIdentify";
import { AutoSync } from "@/components/providers/autoSync";
import { ConfirmProvider } from "@/components/providers/confirmProvider";
import { InstallHint } from "@/components/pwa/installHint";
import { MergeBar } from "@/components/transactions/mergeBar";
import { AccountCurrenciesProvider } from "@/hooks/useAccountCurrencies";
import { AccountLabelsProvider } from "@/hooks/useAccountLabels";
import { DayTotalsInAccountProvider } from "@/hooks/useDayTotalsInAccount";
import { HideAmountsProvider } from "@/hooks/useHideAmounts";
import { SettingsProvider } from "@/hooks/useSettings";
import { getAccountCurrencies, getAccountLabels } from "@/lib/data/accounts";
import { getUserSettings } from "@/lib/data/userSettings";
import {
  readDayTotalsInAccountCookie,
  readHideAmountsCookie,
} from "@/lib/preferences.server";
import type { SessionUser } from "@/lib/session";

export async function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [
    settings,
    hideAmounts,
    dayTotalsInAccount,
    accountLabels,
    accountCurrencies,
  ] = await Promise.all([
    getUserSettings(user.id),
    readHideAmountsCookie(),
    readDayTotalsInAccountCookie(),
    getAccountLabels(user.id),
    getAccountCurrencies(user.id),
  ]);

  if (!settings || !settings.onboarded_at) {
    redirect("/onboarding");
  }

  return (
    <SettingsProvider value={settings}>
      <AccountLabelsProvider value={accountLabels}>
        <AccountCurrenciesProvider value={accountCurrencies}>
          <HideAmountsProvider initial={hideAmounts}>
            <DayTotalsInAccountProvider initial={dayTotalsInAccount}>
              <ConfirmProvider>
                <AnalyticsIdentify userId={user.id} />
                <div className="mx-auto flex w-full max-w-xl flex-1 flex-col lg:max-w-6xl">
                  <Header />
                  <main className="flex-1 px-4 pt-2 pb-[calc(var(--spacing-bottom-nav)+2.25rem)] lg:pb-8">
                    {children}
                  </main>
                </div>
                <BottomNav />
                <InstallHint />
                <MergeBar />
              </ConfirmProvider>
              <AutoSync />
            </DayTotalsInAccountProvider>
          </HideAmountsProvider>
        </AccountCurrenciesProvider>
      </AccountLabelsProvider>
    </SettingsProvider>
  );
}
