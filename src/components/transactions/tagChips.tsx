"use client";

import { useState } from "react";

import { tagHue } from "@/lib/tags";
import { cn } from "@/lib/utils";

import type { CSSProperties } from "react";

function Chip({ tag }: { tag: string }) {
  return (
    <span
      style={{ "--tag-h": tagHue(tag) } as CSSProperties}
      className="tag-chip inline-flex max-w-[10rem] items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium"
    >
      {tag}
    </span>
  );
}

export function TagChips({
  tags,
  className,
}: {
  tags: string[];
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (tags.length === 0) return null;

  const [first, ...rest] = tags;

  if (expanded || rest.length === 0) {
    return (
      <span className={cn("flex min-w-0 flex-wrap items-center gap-1", className)}>
        {tags.map((tag) => (
          <Chip key={tag} tag={tag} />
        ))}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setExpanded(true);
      }}
      aria-label="Show all tags"
      className={cn("flex min-w-0 items-center gap-1", className)}
    >
      <Chip tag={first} />
      <span className="flex items-center gap-0.5">
        {rest.slice(0, 4).map((tag) => (
          <span
            key={tag}
            style={{ "--tag-h": tagHue(tag) } as CSSProperties}
            className="tag-dot size-2 rounded-full"
          />
        ))}
        {rest.length > 4 && (
          <span className="text-muted-foreground text-[10px] font-medium">
            +{rest.length - 4}
          </span>
        )}
      </span>
    </button>
  );
}
