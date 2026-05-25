import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { CsvImportCard } from "@/components/settings/csvImportCard";
import { IntegrationsCard } from "@/components/settings/integrationsCard";
import { SettingsForm } from "@/components/settings/settingsForm";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
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
        title="Integrations"
        hint="Sync transactions automatically from connected accounts."
      >
        <IntegrationsCard />
      </Section>

      <Section
        title="Data import"
        hint="One-off CSV import from any bank or wallet."
      >
        <CsvImportCard />
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
