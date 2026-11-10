"use client";

import { Children, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { OVERFLOW_ITEM_ATTR, useOverflowRow } from "./useOverflowRow";

export function OverflowRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const items = Children.toArray(children);
  const { rowRef, counterRef, visibleCount, measured, itemKeys } =
    useOverflowRow(items);
  const hiddenCount = items.length - visibleCount;

  if (items.length === 0) return null;

  return (
    <div
      ref={rowRef}
      className={cn(
        "relative flex h-5 min-w-0 content-start items-center gap-1 overflow-hidden",
        !measured && "flex-wrap",
        className,
      )}
    >
      {items.map((item, index) => (
        <span
          key={itemKeys[index]}
          {...{ [OVERFLOW_ITEM_ATTR]: "" }}
          className={cn(
            "flex shrink-0",
            index === 0 && visibleCount === 1 && "min-w-0 shrink",
            index >= visibleCount && "invisible absolute",
          )}
        >
          {item}
        </span>
      ))}
      <span
        ref={counterRef}
        className={cn(
          "flex shrink-0",
          hiddenCount === 0 && "invisible absolute",
        )}
      >
        <Badge variant="secondary" aria-label={`${hiddenCount} more`}>
          +{hiddenCount}
        </Badge>
      </span>
    </div>
  );
}
