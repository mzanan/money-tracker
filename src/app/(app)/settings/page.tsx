import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { CashCard } from "@/components/settings/cashCard";
import { CsvImportCard } from "@/components/settings/csvImportCard";
import { ImportedAccountsCard } from "@/components/settings/importedAccountsCard";
import { IngestCard } from "@/components/settings/ingestCard";
import { IntegrationsCard } from "@/components/settings/integrationsCard";
import { SettingsForm } from "@/components/settings/settingsForm";
import { Button } from "@/components/ui/button";
import { getCsvSources } from "@/lib/data/sources";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser();
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

      <Section title="Profile" hint="Currencies and timezone for new entries.">
        <SettingsForm />
      </Section>

      <Section
        title="Cash"
        hint="A manual account for cash you spend or receive in hand."
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
        title="Phone auto-import"
        hint="Capture Wise / Google Wallet notifications from your Android phone."
      >
        <IngestCard />
      </Section>

      <Section
        title="Data import"
        hint="One-off CSV import from any bank or wallet."
      >
        <CsvImportCard existingSources={existingSources} />
      </Section>

      <Section
        title="Imported accounts"
        hint="Rename or wipe everything under an account."
      >
        <ImportedAccountsCard />
      </Section>
    </div>
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
