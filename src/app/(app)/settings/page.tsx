import Link from "next/link";
import { ArrowLeftIcon, ChevronDownIcon } from "lucide-react";

import { AnalyticsConsentCard } from "@/components/settings/analyticsConsentCard";
import { AssistantKeyCard } from "@/components/settings/assistantKeyCard";
import { CalendarFeedCard } from "@/components/settings/calendarFeedCard";
import { CashCard } from "@/components/settings/cashCard";
import { CsvImportCard } from "@/components/settings/csvImportCard";
import { DayTotalsCard } from "@/components/settings/dayTotalsCard";
import { NonDailyLabelsCard } from "@/components/settings/nonDailyLabelsCard";
import { ImportedAccountsCard } from "@/components/settings/importedAccountsCard";
import { IntegrationsCard } from "@/components/settings/integrationsCard";
import { SettingsForm } from "@/components/settings/settingsForm";
import { SettingsTabs } from "@/components/settings/settingsTabs";
import { Button } from "@/components/ui/button";
import { getCsvSources } from "@/lib/data/sources";
import { requireUser } from "@/lib/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const existingSources = await getCsvSources(user.id);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link href="/">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      </header>

      <SettingsTabs
        defaultTab={tab}
        general={
          <>
            <Section
              title="Profile"
              hint="Currencies and timezone for new entries."
            >
              <SettingsForm />
            </Section>
            <Section
              title="Display"
              hint="How amounts are shown on account tabs."
            >
              <DayTotalsCard />
            </Section>
            <Section
              title="Non-daily expenses"
              hint="Any expense whose merchant matches these names counts as non-daily and is kept out of the daily average."
            >
              <NonDailyLabelsCard />
            </Section>
            <Section
              title="Assistant"
              hint="Model and API key for the chat assistant."
            >
              <AssistantKeyCard />
            </Section>
            <CollapsedSection
              title="Calendar feed"
              hint="Show your reminders inside Google / iOS / Outlook calendar."
            >
              <CalendarFeedCard />
            </CollapsedSection>
            <Section title="Privacy" hint="Change your cookie choice anytime.">
              <AnalyticsConsentCard />
            </Section>
          </>
        }
        accounts={
          <>
            <Section
              title="Accounts"
              hint="Create, rename, remove or wipe an account."
            >
              <ImportedAccountsCard />
            </Section>
            <Section
              title="Cash"
              hint="A manual account for cash you spend or receive in hand. Withdraw and exchange from the Cash tab menu."
            >
              <CashCard />
            </Section>
            <Section
              title="Integrations"
              hint="Sync transactions automatically from connected accounts."
            >
              <IntegrationsCard />
            </Section>
            <Section
              title="Data import"
              hint="One-off CSV import from any bank or wallet."
            >
              <CsvImportCard existingSources={existingSources} />
            </Section>
          </>
        }
      />
    </div>
  );
}

function CollapsedSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group grid gap-3">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <h2 className="flex items-center gap-1 text-xs font-semibold tracking-wider uppercase">
          {title}
          <ChevronDownIcon className="text-muted-foreground size-3.5 transition-transform group-open:rotate-180" />
        </h2>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-xs font-semibold tracking-wider uppercase">
          {title}
        </h2>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
