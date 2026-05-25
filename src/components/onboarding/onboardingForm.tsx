"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckIcon,
  Loader2Icon,
  MapPinIcon,
  SearchIcon,
  WalletIcon,
} from "lucide-react";

import { CURRENCIES, getCurrency } from "@/config/currencies";
import { getDeviceTimezone } from "@/hooks/useTimezone";
import { saveOnboarding } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Step = 1 | 2;

export function OnboardingForm() {
  const router = useRouter();
  const tzListId = useId();

  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [base, setBase] = useState<string>("");
  const [tz, setTz] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const deviceTz = getDeviceTimezone();
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

  function toggle(code: string) {
    const isRemoving = selected.includes(code);
    const next = isRemoving
      ? selected.filter((current) => current !== code)
      : [...selected, code];
    setSelected(next);
    if (next.length === 1) setBase(next[0]);
    else if (isRemoving && code === base) setBase(next[0] ?? "");
  }

  function goNext() {
    if (selected.length === 0) {
      toast.error("Pick at least one currency");
      return;
    }
    if (!base) setBase(selected[0]);
    setStep(2);
  }

  async function handleSubmit() {
    setLoading(true);
    const result = await saveOnboarding({
      currencies: selected,
      baseCurrency: base,
      timezone: tz.trim() || null,
    });
    if (!result.ok) {
      setLoading(false);
      toast.error(result.error);
      return;
    }
    toast.success("All set! Time to track.");
    router.replace("/");
    router.refresh();
  }

  const canSubmit = selected.length >= 1 && selected.includes(base);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
            <WalletIcon className="size-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Welcome to Money
          </h1>
          <p className="text-muted-foreground text-sm">
            Track every coin across cash, exchange and bank exports.
          </p>
        </header>

        <StepIndicator current={step} />

        <CardContent className="grid gap-5 p-0">
          {step === 1 ? (
            <CurrenciesStep
              selected={selected}
              query={query}
              onQueryChange={setQuery}
              onToggle={toggle}
              filtered={filtered}
            />
          ) : (
            <BaseAndTimezoneStep
              selected={selected}
              base={base}
              tz={tz}
              tzListId={tzListId}
              timezones={timezones}
              deviceTz={deviceTz}
              onBaseChange={setBase}
              onTzChange={setTz}
            />
          )}
        </CardContent>

        <footer className="flex gap-2">
          {step === 2 && (
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              <ArrowLeftIcon />
              Back
            </Button>
          )}
          {step === 1 ? (
            <Button
              onClick={goNext}
              disabled={selected.length === 0}
              className="flex-1"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex-1"
            >
              {loading && <Loader2Icon className="animate-spin" />}
              Get started
            </Button>
          )}
        </footer>
      </Card>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="my-4 flex items-center justify-center gap-1.5">
      {[1, 2].map((n) => (
        <span
          key={n}
          className={cn(
            "h-1.5 rounded-full transition-all",
            n === current ? "bg-foreground w-6" : "bg-muted w-1.5",
          )}
        />
      ))}
    </div>
  );
}

function CurrenciesStep({
  selected,
  query,
  onQueryChange,
  onToggle,
  filtered,
}: {
  selected: string[];
  query: string;
  onQueryChange: (v: string) => void;
  onToggle: (code: string) => void;
  filtered: typeof CURRENCIES;
}) {
  return (
    <div className="grid gap-2">
      <Label>Which currencies do you use?</Label>
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search currency…"
          className="pl-8"
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border">
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
                onClick={() => onToggle(currency.code)}
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
                <span className="text-muted-foreground">{currency.symbol}</span>
              </button>
            );
          })
        )}
      </div>
      <p className="text-muted-foreground text-xs">{selected.length} selected</p>
    </div>
  );
}

function BaseAndTimezoneStep({
  selected,
  base,
  tz,
  tzListId,
  timezones,
  deviceTz,
  onBaseChange,
  onTzChange,
}: {
  selected: string[];
  base: string;
  tz: string;
  tzListId: string;
  timezones: string[];
  deviceTz: string;
  onBaseChange: (v: string) => void;
  onTzChange: (v: string) => void;
}) {
  return (
    <>
      {selected.length >= 2 && (
        <div className="grid gap-2">
          <Label htmlFor="base-currency">Currency for your totals</Label>
          <p className="text-muted-foreground text-xs">
            All sums and balances render in this one. You can change it later.
          </p>
          <Select
            value={selected.includes(base) ? base : undefined}
            onValueChange={onBaseChange}
          >
            <SelectTrigger id="base-currency">
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
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="timezone">Timezone (optional)</Label>
        <p className="text-muted-foreground text-xs">
          Determines &quot;today&quot; when you add a transaction. Empty uses
          your device&apos;s ({deviceTz}).
        </p>
        <div className="flex gap-2">
          <Input
            id="timezone"
            list={tzListId}
            value={tz}
            onChange={(event) => onTzChange(event.target.value)}
            placeholder={`auto (${deviceTz})`}
            className="flex-1"
          />
          {tz && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onTzChange("")}
            >
              <MapPinIcon /> Auto
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
      </div>
    </>
  );
}

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
