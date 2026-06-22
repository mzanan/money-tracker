"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MiniStat({
  label,
  value,
  icon,
  tone,
  active,
  dimmed,
  onClick,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "income" | "expense";
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "bg-background/60 dark:bg-surface-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all",
        "hover:bg-background/80 dark:hover:bg-surface-2/80 cursor-pointer",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        active &&
          (tone === "income"
            ? "ring-income/40 ring-2"
            : "ring-expense/40 ring-2"),
        dimmed && "opacity-50",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full",
          tone === "income"
            ? "bg-income text-income"
            : "bg-expense text-expense",
        )}
      >
        {icon}
      </span>
      <div className="grid">
        <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
    </button>
  );
}
