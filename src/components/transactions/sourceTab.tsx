"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SourceTab({
  selected,
  onClick,
  children,
  menu,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  menu?: ReactNode;
}) {
  return (
    <div
      role="presentation"
      className="relative flex shrink-0 items-center gap-0.5"
    >
      <button
        type="button"
        role="tab"
        onClick={onClick}
        aria-selected={selected}
        className={cn(
          "py-3 text-sm transition-colors",
          selected
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground font-medium",
        )}
      >
        {children}
      </button>
      {menu}
      {selected && (
        <span
          aria-hidden
          className="bg-foreground absolute right-0 bottom-0 left-0 h-0.5"
        />
      )}
    </div>
  );
}
