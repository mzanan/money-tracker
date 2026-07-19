"use client";

import { XIcon } from "lucide-react";

import { tagHue } from "@/lib/tags";
import { cn } from "@/lib/utils";

import type { CSSProperties } from "react";

export function TagChip({
  tag,
  onRemove,
  onSelect,
  className,
}: {
  tag: string;
  onRemove?: () => void;
  onSelect?: () => void;
  className?: string;
}) {
  const style = { "--tag-h": tagHue(tag) } as CSSProperties;
  const base =
    "tag-chip inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Add ${tag}`}
        style={style}
        className={cn(base, "max-w-[10rem] cursor-pointer truncate", className)}
      >
        {tag}
      </button>
    );
  }

  if (!onRemove) {
    return (
      <span
        style={style}
        className={cn(base, "max-w-[10rem] truncate", className)}
      >
        {tag}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${tag}`}
      style={style}
      className={cn(base, "gap-1", className)}
    >
      {tag}
      <XIcon className="size-3 opacity-60" />
    </button>
  );
}
