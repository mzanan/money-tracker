"use client";

import { ChevronDownIcon, Loader2Icon, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/ui/surface";

import { KindToggle } from "./kindToggle";
import { useQuickAddForm } from "./useQuickAddForm";

interface Props {
  recentTags: string[];
}

export function QuickAddForm({ recentTags }: Props) {
  const {
    kind,
    setKind,
    amount,
    setAmount,
    currency,
    setCurrency,
    currencies,
    currencyMeta,
    numericAmount,
    preview,
    ratesPending,
    baseCurrency,
    showExtras,
    setShowExtras,
    tagsId,
    tagsInput,
    setTagsInput,
    date,
    setDate,
    pending,
    handleSubmit,
  } = useQuickAddForm();

  return (
    <Surface asChild radius="lg" padding="sm" className="grid gap-3">
      <form id="quick-add" onSubmit={handleSubmit} className="scroll-mt-20">
        <div className="flex items-center gap-2">
          <KindToggle kind={kind} onChange={setKind} />
          <div className="bg-surface-2 relative flex flex-1 items-center rounded-xl pr-1.5">
            <span className="text-muted-foreground pointer-events-none absolute left-3 text-sm tabular-nums">
              {currencyMeta.symbol}
            </span>
            <Input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(/[^\d.,]/g, ""))
              }
              aria-label="Amount"
              className="h-11 border-none bg-transparent pl-7 text-base tabular-nums focus-visible:ring-0"
              required
            />
            {currencies.length > 1 && (
              <CurrencySelect
                value={currency}
                onValueChange={setCurrency}
                currencies={currencies}
                ariaLabel="Currency"
                className="bg-background ml-1 h-8 w-[4.5rem] rounded-lg border-none text-xs"
              />
            )}
          </div>
          <Button
            type="submit"
            disabled={pending || numericAmount === null}
            className="h-11 rounded-xl px-4"
          >
            {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
            Add
          </Button>
        </div>

        {(preview ||
          (currency !== baseCurrency &&
            ratesPending &&
            numericAmount !== null)) && (
          <div className="text-muted-foreground -mt-1 px-1 text-xs">
            {preview ? (
              <>
                ≈ <span className="text-foreground">{preview}</span>{" "}
                <span className="opacity-60">today&apos;s rate</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Loader2Icon className="size-3 animate-spin" /> Calculating…
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowExtras((value) => !value)}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 px-1 text-xs transition-colors"
        >
          <ChevronDownIcon
            className={cn(
              "size-3 transition-transform",
              showExtras && "rotate-180",
            )}
          />
          {showExtras ? "Hide details" : "Add tags, date"}
        </button>

        {showExtras && (
          <div className="grid gap-2 px-1">
            <div className="grid gap-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                list={tagsId}
                placeholder="food, transport, rent…"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                maxLength={120}
                className="bg-surface-2 h-9 border-none"
              />
              {recentTags.length > 0 && (
                <datalist id={tagsId}>
                  {recentTags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="bg-surface-2 h-9 border-none"
              />
            </div>
          </div>
        )}
      </form>
    </Surface>
  );
}
