"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SourceTab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      aria-selected={selected}
      className={cn(
        "relative shrink-0 py-3 text-sm transition-colors",
        selected
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground font-medium",
      )}
    >
      {children}
      {selected && (
        <span
          aria-hidden
          className="bg-foreground absolute bottom-0 left-0 right-0 h-0.5"
        />
      )}
    </button>
  );
}
