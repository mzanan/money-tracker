"use client";

import { Loader2Icon } from "lucide-react";

import { getCurrency } from "@/lib/constants/currencies";
import { labelForSource } from "@/lib/constants/sources";

import { AmountInput } from "@/components/ui/amountInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCashWithdrawalForm } from "./useCashWithdrawalForm";

export function CashWithdrawalForm({ sources }: { sources: string[] }) {
  const {
    currencies,
    amount,
    setAmount,
    currency,
    setCurrency,
    source,
    setSource,
    date,
    setDate,
    pending,
    handleSubmit,
  } = useCashWithdrawalForm(sources);

  if (sources.length === 0) return null;

  return (
    <Card>
      <CardContent className="py-4">
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div>
            <p className="text-sm font-medium">Withdraw cash</p>
            <p className="text-muted-foreground text-xs">
              Move money from an account into your cash pocket. Does not count
              as spending; each cash expense you log draws it down.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="withdrawal-source">From account</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger
                  id="withdrawal-source"
                  className="bg-surface-2 h-9 w-full border-none"
                >
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelForSource(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="withdrawal-amount">Amount</Label>
              <div className="flex gap-1">
                <AmountInput
                  id="withdrawal-amount"
                  placeholder="0"
                  value={amount}
                  onChange={setAmount}
                  decimals={getCurrency(currency).decimals}
                  className="bg-surface-2 h-9 border-none"
                />
                <CurrencySelect
                  value={currency}
                  onValueChange={setCurrency}
                  currencies={currencies}
                  ariaLabel="Withdrawal currency"
                  className="bg-surface-2 h-9 w-[4.5rem] border-none text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="withdrawal-date">Date</Label>
              <Input
                id="withdrawal-date"
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
