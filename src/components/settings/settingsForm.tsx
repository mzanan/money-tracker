"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, Loader2Icon, MapPinIcon, SearchIcon } from "lucide-react";

import { CURRENCIES, getCurrency } from "@/config/currencies";
import { useSettings } from "@/hooks/useSettings";
import { getDeviceTimezone } from "@/hooks/useTimezone";
import { updateSettings } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getSupportedTimezones(): string[] {
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    return intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
}

export function SettingsForm() {
  const router = useRouter();
  const settings = useSettings();
  const tzListId = useId();
  const [pending, startTransition] = useTransition();

  const [selected, setSelected] = useState<string[]>(settings.currencies);
  const [base, setBase] = useState(settings.base_currency);
  const [tz, setTz] = useState(settings.timezone ?? "");
  const [query, setQuery] = useState("");

  const timezones = useMemo(() => getSupportedTimezones(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (currency) =>
        currency.code.toLowerCase().includes(q) ||
        currency.name.toLowerCase().includes(q),
    );
  }, [query]);

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
    startTransition(async () => {
      const result = await updateSettings({
        currencies: selected,
        baseCurrency: base,
        timezone: tz.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings updated");
      router.refresh();
    });
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
        <CardContent className="grid gap-3">
          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search currency…"
              className="pl-8"
            />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground p-4 text-center text-sm">
                No results
              </p>
            ) : (
              filtered.map((currency) => {
                const isSelected = selected.includes(currency.code);
                return (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => toggleCurrency(currency.code)}
                    className={cn(
                      "hover:bg-muted/60 flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm transition-colors last:border-b-0",
                      isSelected && "bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3.5" />}
                    </span>
                    <span className="text-muted-foreground w-10 font-mono text-xs">
                      {currency.code}
                    </span>
                    <span className="flex-1 truncate">{currency.name}</span>
                    <span className="text-muted-foreground">
                      {currency.symbol}
                    </span>
                  </button>
                );
              })
            )}
          </div>
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
            <Select
              value={selected.includes(base) ? base : undefined}
              onValueChange={setBase}
            >
              <SelectTrigger id="base-currency" className="w-full">
                <SelectValue placeholder="Pick a currency" />
              </SelectTrigger>
              <SelectContent>
                {selected.map((code) => {
                  const currency = getCurrency(code);
                  return (
                    <SelectItem key={code} value={code}>
                      {currency.code} — {currency.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
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
          <div className="flex gap-2">
            <Input
              id="timezone"
              list={tzListId}
              value={tz}
              onChange={(event) => setTz(event.target.value)}
              placeholder={`auto (${deviceTz})`}
              className="flex-1"
            />
            {tz && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setTz("")}
                className="gap-1"
              >
                <MapPinIcon className="size-3.5" /> Auto
              </Button>
            )}
          </div>
          {timezones.length > 0 && (
            <datalist id={tzListId}>
              {timezones.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          )}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={!dirty || pending} className="h-11">
        {pending && <Loader2Icon className="animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}
