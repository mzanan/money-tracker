import type { Metadata } from "next";

import { LandingContainer } from "@/components/landing/landingContainer";
import { LandingShell } from "@/components/landing/landingShell";
import { LegalSection } from "@/components/legal/legalSection";
import { AnalyticsConsentCard } from "@/components/settings/analyticsConsentCard";
import { Heading } from "@/components/ui/heading";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Money Tracker collects, uses and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LandingShell>
      <LandingContainer className="grid max-w-2xl gap-8 py-16">
        <div className="grid gap-2">
          <Heading as="h1" size="display" className="text-4xl sm:text-5xl">
            Privacy Policy
          </Heading>
          <p className="text-muted-foreground text-sm">
            Last updated October 4, 2026
          </p>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">
          Money Tracker is an income and expense tracker operated by Matias
          Zanan at money.itsmatias.com. This policy explains what we collect,
          why, and the choices you have.
        </p>

        <LegalSection title="Information we collect">
          <p>
            <strong className="text-foreground">Account.</strong> Your email,
            name and a hashed password, or a Google sign-in identifier.
          </p>
          <p>
            <strong className="text-foreground">Financial records.</strong> The
            transactions, accounts, reminders and notes you enter, import from
            CSV files or extract from screenshots you upload.
          </p>
          <p>
            <strong className="text-foreground">Integrations.</strong> If you
            connect Bybit or add an AI provider key, we store those keys
            encrypted and use them only to sync your data or answer your
            requests.
          </p>
        </LegalSection>

        <LegalSection title="How we use it">
          <p>
            To run the service: keep your records, convert currencies, sync the
            integrations you connect and answer the assistant requests you make.
            We do not sell your data or use it for advertising.
          </p>
        </LegalSection>

        <LegalSection title="Processors we share with">
          <p>
            Vercel (hosting), Turso (database), Google (sign-in), Bybit (sync
            you connect), Google Gemini or Groq (only when you use AI features
            with your key) and PostHog EU (analytics, see Cookies). Exchange
            rates come from open.er-api.com without any personal data.
          </p>
        </LegalSection>

        <LegalSection title="Data retention and deletion">
          <p>
            You can delete transactions and accounts at any time from the app,
            and request full account deletion by emailing{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="mailto:hello@itsmatias.com"
            >
              hello@itsmatias.com
            </a>
            . We remove your data within 30 days of the request.
          </p>
        </LegalSection>

        <LegalSection title="Your rights">
          <p>
            You have the right to access, correct, export or delete your
            personal data. Contact us for any request.
          </p>
        </LegalSection>

        <LegalSection title="Cookies">
          <p>
            We use a session cookie to keep you signed in and a cookie that
            remembers your analytics choice. If you accept analytics, PostHog
            (EU region) sets first-party cookies for usage analytics and session
            replay with all text masked. If you decline, we only count visits
            anonymously without cookies. No advertising cookies. You can change
            your choice here at any time.
          </p>
          <AnalyticsConsentCard />
        </LegalSection>
      </LandingContainer>
    </LandingShell>
  );
}
