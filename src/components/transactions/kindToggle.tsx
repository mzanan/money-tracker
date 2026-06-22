"use client";

import { cn } from "@/lib/utils";

export type Kind = "expense" | "income";

export function KindToggle({
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
