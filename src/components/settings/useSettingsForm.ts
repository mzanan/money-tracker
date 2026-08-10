"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/actions/settings";
import { getDeviceTimezone } from "@/lib/dates";

export function useSettingsForm() {
  const settings = useSettings();
  const { run, pending } = useServerAction();

  const [selected, setSelected] = useState<string[]>(settings.currencies);
  const [base, setBase] = useState(settings.base_currency);
  const [tz, setTz] = useState(settings.timezone ?? "");

  function toggleCurrency(code: string) {
    const isRemoving = selected.includes(code);
    if (isRemoving && selected.length <= 1) {
      toast.error("You need to keep at least one currency");
      return;
    }
    const next = isRemoving
      ? selected.filter((current) => current !== code)
      : [...selected, code];
    setSelected(next);
    if (next.length === 1) {
      setBase(next[0]);
    } else if (isRemoving && code === base) {
      setBase(next[0] ?? "");
    }
  }

  function save() {
    run(
      () =>
        updateSettings({
          currencies: selected,
          baseCurrency: base,
          timezone: tz.trim() || null,
        }),
      { success: "Settings updated" },
    );
  }

  const dirty =
    JSON.stringify(selected.slice().sort()) !==
      JSON.stringify(settings.currencies.slice().sort()) ||
    base !== settings.base_currency ||
    (tz.trim() || null) !== settings.timezone;

  const deviceTz = getDeviceTimezone();

  return {
    selected,
    base,
    setBase,
    tz,
    setTz,
    toggleCurrency,
    save,
    dirty,
    pending,
    deviceTz,
  };
}
