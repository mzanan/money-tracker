import Link from "next/link";
import { ArrowLeftIcon, ChevronDownIcon } from "lucide-react";

import { CalendarFeedCard } from "@/components/settings/calendarFeedCard";
import { CashCard } from "@/components/settings/cashCard";
import { CashExchangeForm } from "@/components/settings/cashExchangeForm";
import { CashWithdrawalForm } from "@/components/settings/cashWithdrawalForm";
import { CsvImportCard } from "@/components/settings/csvImportCard";
import { ImportedAccountsCard } from "@/components/settings/importedAccountsCard";
import { IntegrationsCard } from "@/components/settings/integrationsCard";
import { SettingsForm } from "@/components/settings/settingsForm";
import { SettingsTabs } from "@/components/settings/settingsTabs";
import { Button } from "@/components/ui/button";
import { getCsvSources, getTransferSources } from "@/lib/data/sources";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser();
  const [existingSources, withdrawalSources] = await Promise.all([
    getCsvSources(user.id),
    getTransferSources(user.id, "manual"),
  ]);

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
        general={
          <Section
            title="Profile"
            hint="Currencies and timezone for new entries."
          >
            <SettingsForm />
          </Section>
        }
        cash={
          <Section
            title="Cash"
            hint="A manual account for cash you spend or receive in hand."
          >
            <div className="grid gap-3">
              <CashCard />
              <CashWithdrawalForm sources={withdrawalSources} />
              <CashExchangeForm />
            </div>
          </Section>
        }
        accounts={
          <>
            <Section
              title="Integrations"
              hint="Sync transactions automatically from connected accounts."
            >
              <IntegrationsCard />
            </Section>
            <Section
              title="Imported accounts"
              hint="Rename or wipe everything under an account."
            >
              <ImportedAccountsCard />
            </Section>
          </>
        }
        data={
          <>
            <Section
              title="Data import"
              hint="One-off CSV import from any bank or wallet."
            >
              <CsvImportCard existingSources={existingSources} />
            </Section>
            <CollapsedSection
              title="Calendar feed"
              hint="Show your reminders inside Google / iOS / Outlook calendar."
            >
              <CalendarFeedCard />
            </CollapsedSection>
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
        {hint && (
          <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
        )}
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
        {hint && (
          <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}
