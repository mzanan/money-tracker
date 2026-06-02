"use client";

import { useMemo, useState } from "react";
import { CheckIcon, SearchIcon } from "lucide-react";

import { CURRENCIES } from "@/config/currencies";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";

export function CurrencyPicker({
  selected,
  onToggle,
  maxHeight = "max-h-72",
}: {
  selected: string[];
  onToggle: (code: string) => void;
  maxHeight?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (currency) =>
        currency.code.toLowerCase().includes(q) ||
        currency.name.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="grid gap-2">
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search currency…"
          className="pl-8"
        />
      </div>
      <div className={cn("overflow-y-auto rounded-lg border", maxHeight)}>
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
    </div>
  );
}
