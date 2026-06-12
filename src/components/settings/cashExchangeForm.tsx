"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { recordCashExchange } from "@/lib/actions/cash";
import { todayInTz } from "@/lib/dates";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function parseAmount(value: string): number | null {
  const num = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function CashExchangeForm() {
  const settings = useSettings();
  const timezone = useTimezone();
  const { run, pending } = useServerAction();

  const [outAmount, setOutAmount] = useState("");
  const [outCurrency, setOutCurrency] = useState(settings.currencies[0]);
  const [inAmount, setInAmount] = useState("");
  const [inCurrency, setInCurrency] = useState(
    settings.currencies[1] ?? settings.currencies[0],
  );
  const [date, setDate] = useState(() => todayInTz(timezone));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const out = parseAmount(outAmount);
    const incoming = parseAmount(inAmount);
    if (out === null || incoming === null) {
      toast.error("Enter both amounts");
      return;
    }
    run(
      () =>
        recordCashExchange({
          outAmount: out,
          outCurrency,
          inAmount: incoming,
          inCurrency,
          occurredOn: date,
        }),
      {
        success: `Exchanged ${outCurrency} → ${inCurrency}`,
        onSuccess: () => {
          setOutAmount("");
          setInAmount("");
        },
      },
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div>
            <p className="text-sm font-medium">Exchange cash</p>
            <p className="text-muted-foreground text-xs">
              Swap cash between currencies (e.g. USD bills for VND). Does not
              count as spending.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="exchange-out" className="text-eyebrow">
                You give
              </Label>
              <div className="flex gap-1">
                <Input
                  id="exchange-out"
                  inputMode="decimal"
                  placeholder="0"
                  value={outAmount}
                  onChange={(event) => setOutAmount(event.target.value)}
                  className="bg-surface-2 h-9 border-none tabular-nums"
                />
                <CurrencySelect
                  value={outCurrency}
                  onValueChange={setOutCurrency}
                  currencies={settings.currencies}
                  ariaLabel="Currency you give"
                  className="bg-surface-2 h-9 w-[4.5rem] border-none text-xs"
                />
              </div>
            </div>
            <ArrowRightIcon className="text-muted-foreground mb-2.5 size-4 shrink-0" />
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="exchange-in" className="text-eyebrow">
                You get
              </Label>
              <div className="flex gap-1">
                <Input
                  id="exchange-in"
                  inputMode="decimal"
                  placeholder="0"
                  value={inAmount}
                  onChange={(event) => setInAmount(event.target.value)}
                  className="bg-surface-2 h-9 border-none tabular-nums"
                />
                <CurrencySelect
                  value={inCurrency}
                  onValueChange={setInCurrency}
                  currencies={settings.currencies}
                  ariaLabel="Currency you get"
                  className="bg-surface-2 h-9 w-[4.5rem] border-none text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="exchange-date" className="text-eyebrow">
                Date
              </Label>
              <Input
                id="exchange-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="bg-surface-2 h-9 border-none"
              />
            </div>
            <Button type="submit" disabled={pending} className="h-9">
              {pending && <Loader2Icon className="animate-spin" />}
              Record
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
