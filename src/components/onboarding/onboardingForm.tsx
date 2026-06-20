"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, Loader2Icon, WalletIcon } from "lucide-react";

import { saveOnboarding } from "@/lib/actions/settings";
import { getDeviceTimezone } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyPicker } from "@/components/ui/currencyPicker";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Label } from "@/components/ui/label";
import { TimezoneField } from "@/components/ui/timezoneField";

type Step = 1 | 2;

export function OnboardingForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [base, setBase] = useState<string>("");
  const [tz, setTz] = useState("");
  const [loading, setLoading] = useState(false);

  const deviceTz = getDeviceTimezone();

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
            <CurrenciesStep selected={selected} onToggle={toggle} />
          ) : (
            <BaseAndTimezoneStep
              selected={selected}
              base={base}
              tz={tz}
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
  onToggle,
}: {
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>Which currencies do you use?</Label>
      <CurrencyPicker
        selected={selected}
        onToggle={onToggle}
        maxHeight="max-h-64"
      />
      <p className="text-muted-foreground text-xs">{selected.length} selected</p>
    </div>
  );
}

function BaseAndTimezoneStep({
  selected,
  base,
  tz,
  deviceTz,
  onBaseChange,
  onTzChange,
}: {
  selected: string[];
  base: string;
  tz: string;
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
          <CurrencySelect
            id="base-currency"
            value={selected.includes(base) ? base : undefined}
            onValueChange={onBaseChange}
            currencies={selected}
            showName
            placeholder="Pick a currency"
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="timezone">Timezone (optional)</Label>
        <p className="text-muted-foreground text-xs">
          Determines &quot;today&quot; when you add a transaction. Empty uses
          your device&apos;s ({deviceTz}).
        </p>
        <TimezoneField value={tz} onChange={onTzChange} deviceTz={deviceTz} />
      </div>
    </>
  );
}
