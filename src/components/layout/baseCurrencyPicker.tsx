"use client";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/actions/settings";

import { CurrencySelect } from "@/components/ui/currencySelect";

export function BaseCurrencyPicker() {
  const settings = useSettings();
  const { run, pending } = useServerAction();

  if (settings.currencies.length < 2) return null;

  function changeBase(code: string) {
    if (code === settings.base_currency) return;
    run(() =>
      updateSettings({
        currencies: settings.currencies,
        baseCurrency: code,
        timezone: settings.timezone,
      }),
    );
  }

  return (
    <CurrencySelect
      value={settings.base_currency}
      onValueChange={changeBase}
      currencies={settings.currencies}
      disabled={pending}
      className="w-20"
      ariaLabel="Display currency"
    />
  );
}
