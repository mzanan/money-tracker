"use client";

import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, Loader2Icon, PlusIcon } from "lucide-react";

import { getCurrency } from "@/config/currencies";
import { useRates } from "@/hooks/useRates";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import { createTransaction } from "@/lib/actions/transactions";
import { convert, formatMoney, roundForCurrency } from "@/lib/currency";
import { todayInTz } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/ui/surface";

interface Props {
  recentTags: string[];
}

type Kind = "expense" | "income";

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function QuickAddForm({ recentTags }: Props) {
  const settings = useSettings();
  const timezone = useTimezone();
  const ratesQuery = useRates();
  const { run, pending } = useServerAction();
  const tagsId = useId();

  const lastCurrency = useUiStore((state) => state.lastCurrency);
  const setLastCurrency = useUiStore((state) => state.setLastCurrency);

  const initialCurrency =
    lastCurrency && settings.currencies.includes(lastCurrency)
      ? lastCurrency
      : settings.currencies[0];

  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [currencyState, setCurrency] = useState(initialCurrency);
  const [tagsInput, setTagsInput] = useState("");
  const [date, setDate] = useState(() => todayInTz(timezone));
  const [showExtras, setShowExtras] = useState(false);

  const currency = settings.currencies.includes(currencyState)
    ? currencyState
    : settings.currencies[0];

  const numericAmount = parseAmount(amount);

  const preview = useMemo(() => {
    if (numericAmount === null) return null;
    if (currency === settings.base_currency) return null;
    const rates = ratesQuery.data?.rates;
    if (!rates) return null;
    try {
      const converted = convert(
        numericAmount,
        currency,
        settings.base_currency,
        rates,
      );
      const rounded = roundForCurrency(converted, settings.base_currency);
      return formatMoney(rounded, settings.base_currency);
    } catch {
      return null;
    }
  }, [numericAmount, currency, settings.base_currency, ratesQuery.data]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (numericAmount === null) {
      toast.error("Enter an amount");
      return;
    }

    const rounded = roundForCurrency(numericAmount, currency);

    run(
      () =>
        createTransaction({
          kind,
          amount: rounded,
          currency,
          tags: tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          note: null,
          occurredOn: date,
        }),
      {
        success: `${kind === "income" ? "Income" : "Expense"} · ${formatMoney(rounded, currency)}`,
        onSuccess: () => {
          setAmount("");
          setTagsInput("");
          setLastCurrency(currency);
        },
      },
    );
  }

  const currencyMeta = getCurrency(currency);

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
            {settings.currencies.length > 1 && (
              <CurrencySelect
                value={currency}
                onValueChange={setCurrency}
                currencies={settings.currencies}
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
          (currency !== settings.base_currency &&
            ratesQuery.isPending &&
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

function KindToggle({
  kind,
  onChange,
}: {
  kind: Kind;
  onChange: (kind: Kind) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Kind"
      className="bg-surface-2 flex shrink-0 items-center rounded-xl p-1"
    >
      <button
        type="button"
        role="radio"
        aria-checked={kind === "expense"}
        onClick={() => onChange("expense")}
        className={cn(
          "flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
          kind === "expense"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Expense"
      >
        Out
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={kind === "income"}
        onClick={() => onChange("income")}
        className={cn(
          "flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
          kind === "income"
            ? "bg-card text-income shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Income"
      >
        In
      </button>
    </div>
  );
}
