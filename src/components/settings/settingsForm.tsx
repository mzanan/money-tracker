"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { getDeviceTimezone } from "@/hooks/useTimezone";
import { updateSettings } from "@/lib/actions/settings";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CurrencyPicker } from "@/components/ui/currencyPicker";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Label } from "@/components/ui/label";
import { TimezoneField } from "@/components/ui/timezoneField";

export function SettingsForm() {
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

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Currencies</CardTitle>
          <CardDescription>
            The currencies you record transactions in. At least one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencyPicker selected={selected} onToggle={toggleCurrency} />
        </CardContent>
      </Card>

      {selected.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Base currency</CardTitle>
            <CardDescription>
              The one you see your totals in. You can change it anytime: old
              transactions get reconverted with their snapshotted rate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="base-currency" className="sr-only">
              Base currency
            </Label>
            <CurrencySelect
              id="base-currency"
              value={selected.includes(base) ? base : undefined}
              onValueChange={setBase}
              currencies={selected}
              showName
              placeholder="Pick a currency"
              className="w-full"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
          <CardDescription>
            Defines what day is <em>today</em> when adding new transactions.
            Changing it does <strong>not</strong> re-map existing records; it
            only affects the default date for future ones. Empty = use the
            device timezone ({deviceTz}).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Label htmlFor="timezone">Override (IANA)</Label>
          <TimezoneField value={tz} onChange={setTz} deviceTz={deviceTz} />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={!dirty || pending} className="h-11">
        {pending && <Loader2Icon className="animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}
