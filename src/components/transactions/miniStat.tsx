"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IconCircle } from "@/components/ui/iconCircle";

export function MiniStat({
  label,
  value,
  icon,
  tone,
  active = false,
  dimmed = false,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: "income" | "expense";
  active?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}) {
  const interactive = onClick !== undefined;
  const Comp = interactive ? "button" : "div";

  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      aria-pressed={interactive ? active : undefined}
      className={cn(
        "bg-background/60 dark:bg-surface-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all",
        interactive &&
          "hover:bg-background/80 dark:hover:bg-surface-2/80 cursor-pointer",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        active &&
          (tone === "income"
            ? "ring-income/40 ring-2"
            : "ring-expense/40 ring-2"),
        dimmed && "opacity-50",
      )}
    >
      <IconCircle
        className={cn(
          "size-8",
          tone === "income"
            ? "bg-income text-income"
            : "bg-expense text-expense",
        )}
      >
        {icon}
      </IconCircle>
      <div className="grid">
        <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
    </Comp>
  );
}
