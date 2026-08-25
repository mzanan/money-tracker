"use client";

import { Loader2Icon } from "lucide-react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { getCurrency } from "@/lib/constants/currencies";
import { resolveSourceLabel } from "@/lib/constants/sources";
import { RATE_DECIMALS } from "@/lib/withdrawal";

import {
  AmountCurrencyField,
  AmountField,
} from "@/components/ui/amountCurrencyField";
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

import { useCashWithdrawalForm } from "./useCashWithdrawalForm";

export function CashWithdrawalForm({ sources }: { sources: string[] }) {
  const accountLabels = useAccountLabels();
  const {
    currencies,
    amount,
    setAmount,
    currency,
    setCurrency,
    chargedCurrency,
    setChargedCurrency,
    total,
    setTotal,
    rate,
    setRate,
    fee,
    setFee,
    needsCharge,
    totalFilled,
    rateFilled,
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
            <p className="text-muted-foreground text-xs">
              Enter what your account was charged, or the rate it used. One of
              the two is enough.
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
                      {resolveSourceLabel(s, accountLabels)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AmountCurrencyField
              id="withdrawal-amount"
              label="Cash received"
              value={amount}
              onChange={setAmount}
              currency={currency}
              onCurrencyChange={setCurrency}
              currencies={currencies}
              currencyAriaLabel="Cash currency"
            />
          </div>
          <div className="flex items-end gap-2">
            <AmountCurrencyField
              id="withdrawal-total"
              label="Total charged"
              value={total}
              onChange={setTotal}
              currency={chargedCurrency}
              onCurrencyChange={setChargedCurrency}
              currencies={currencies}
              currencyAriaLabel="Charged currency"
              disabled={rateFilled}
            />
          </div>
          <div className="flex items-end gap-2">
            {needsCharge && (
              <AmountField
                id="withdrawal-rate"
                label={`Rate (1 ${chargedCurrency} = ? ${currency})`}
                value={rate}
                onChange={setRate}
                decimals={RATE_DECIMALS}
                disabled={totalFilled}
              />
            )}
            <AmountField
              id="withdrawal-fee"
              label={`Fee (${chargedCurrency}), optional`}
              value={fee}
              onChange={setFee}
              decimals={getCurrency(chargedCurrency).decimals}
            />
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
