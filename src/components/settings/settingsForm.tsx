"use client";

import { Loader2Icon } from "lucide-react";

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

import { useSettingsForm } from "./useSettingsForm";

export function SettingsForm() {
  const {
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
  } = useSettingsForm();

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
