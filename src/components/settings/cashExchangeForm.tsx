"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";

import { getCurrency } from "@/config/currencies";

import { AmountInput } from "@/components/ui/amountInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useCashExchangeForm } from "./useCashExchangeForm";

export function CashExchangeForm() {
  const {
    currencies,
    outAmount,
    setOutAmount,
    outCurrency,
    setOutCurrency,
    inAmount,
    setInAmount,
    inCurrency,
    setInCurrency,
    date,
    setDate,
    pending,
    handleSubmit,
  } = useCashExchangeForm();

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
              <Label htmlFor="exchange-out">You give</Label>
              <div className="flex gap-1">
                <AmountInput
                  id="exchange-out"
                  placeholder="0"
                  value={outAmount}
                  onChange={setOutAmount}
                  decimals={getCurrency(outCurrency).decimals}
                  className="bg-surface-2 h-9 border-none"
                />
                <CurrencySelect
                  value={outCurrency}
                  onValueChange={setOutCurrency}
                  currencies={currencies}
                  ariaLabel="Currency you give"
                  className="bg-surface-2 h-9 w-[4.5rem] border-none text-xs"
                />
              </div>
            </div>
            <ArrowRightIcon className="text-muted-foreground mb-2.5 size-4 shrink-0" />
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="exchange-in">You get</Label>
              <div className="flex gap-1">
                <AmountInput
                  id="exchange-in"
                  placeholder="0"
                  value={inAmount}
                  onChange={setInAmount}
                  decimals={getCurrency(inCurrency).decimals}
                  className="bg-surface-2 h-9 border-none"
                />
                <CurrencySelect
                  value={inCurrency}
                  onValueChange={setInCurrency}
                  currencies={currencies}
                  ariaLabel="Currency you get"
                  className="bg-surface-2 h-9 w-[4.5rem] border-none text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="exchange-date">Date</Label>
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
