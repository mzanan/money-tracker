"use client";

import { useAnalyticsConsent } from "@/hooks/useAnalyticsConsent";

import { SettingToggleCard } from "@/components/ui/settingToggleCard";

export function AnalyticsConsentCard() {
  const { status, accept, decline } = useAnalyticsConsent();

  if (status === null) return null;

  return (
    <SettingToggleCard
      title="Analytics cookies"
      description="Usage analytics and text-masked session replay. Off means visits are only counted anonymously."
      checked={status === "granted"}
      onCheckedChange={(checked) => (checked ? accept() : decline())}
    />
  );
}
