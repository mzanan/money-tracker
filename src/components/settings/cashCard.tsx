"use client";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { setCashEnabled } from "@/lib/actions/settings";

import { SettingToggleCard } from "@/components/ui/settingToggleCard";

export function CashCard() {
  const settings = useSettings();
  const { run, pending } = useServerAction();

  return (
    <SettingToggleCard
      title="Enable cash account"
      description={
        <>
          Adds a &ldquo;Cash&rdquo; tab on the home to log income and expenses
          by hand.
        </>
      }
      checked={settings.cash_enabled}
      disabled={pending}
      onCheckedChange={(checked) => run(() => setCashEnabled(checked))}
    />
  );
}
