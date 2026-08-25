"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/ui/reveal";
import { Surface } from "@/components/ui/surface";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Transaction } from "@/types/db";

import { MonthView } from "./monthView";
import type { FilterScope } from "./useDashboardControls";

export function FiltersPanel({
  baseCurrency,
  minInput,
  setMinInput,
  maxInput,
  setMaxInput,
  scope,
  setScope,
  onClear,
  amountActive,
  results,
  includeTransfers = false,
}: {
  baseCurrency: string;
  minInput: string;
  setMinInput: (value: string) => void;
  maxInput: string;
  setMaxInput: (value: string) => void;
  scope: FilterScope;
  setScope: (value: FilterScope) => void;
  onClear: () => void;
  amountActive: boolean;
  results: Transaction[];
  includeTransfers?: boolean;
}) {
  return (
    <>
      <Surface className="grid gap-4">
        <p className="text-muted-foreground text-xs">
          Find large payments to attach a reminder. Amounts in {baseCurrency}.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="filter-min">From</Label>
            <Input
              id="filter-min"
              inputMode="decimal"
              placeholder="100"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-max">To</Label>
            <Input
              id="filter-max"
              inputMode="decimal"
              placeholder="∞"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Range</Label>
          <Tabs
            value={scope}
            onValueChange={(value) => setScope(value as FilterScope)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="all">All time</TabsTrigger>
              <TabsTrigger value="month">This month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={onClear}
        >
          Clear
        </Button>
      </Surface>

      <Reveal open={amountActive}>
        <MonthView
          transactions={results}
          includeTransfers={includeTransfers}
          groupCarriedOver={scope === "month"}
          emptyLabel="No transactions match these filters."
        />
      </Reveal>
      <Reveal open={!amountActive}>
        <Surface
          radius="lg"
          padding="none"
          className="text-muted-foreground px-6 py-16 text-center text-sm"
        >
          Enter an amount to list matching payments.
        </Surface>
      </Reveal>
    </>
  );
}
